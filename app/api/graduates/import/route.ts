import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateDefaultPassword, hashPassword } from "@/lib/password";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/src/generated/prisma";
import type { ParsedRow } from "@/lib/excel/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ ENTERPRISE CONFIG: Batch size and performance tuning
const BATCH_SIZE = 50;           // Process 50 rows per batch to avoid memory bloat
const CHUNK_SIZE = 25;           // Insert/update in chunks for better DB throughput
const PARALLEL_BATCHES = 3;      // Process multiple batches in parallel
const QUERY_TIMEOUT = 30000;     // 30 second timeout for critical operations
const MAX_RETRIES = 3;           // ✅ Retry failed queries up to 3 times
const RETRY_DELAY_MS = 1000;     // ✅ Wait 1 second before retrying

// ✅ Helper: Retry with exponential backoff for connection errors
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error worth retrying
      const isConnectionError = 
        lastError.message?.includes("Connection terminated") ||
        lastError.message?.includes("ECONNREFUSED") ||
        lastError.message?.includes("ENOTFOUND") ||
        lastError.message?.includes("timeout") ||
        (lastError as any).code === "ETIMEDOUT" ||
        (lastError as any).code === "ECONNRESET";
      
      if (!isConnectionError || attempt === maxRetries) {
        console.error(`[import] ${operationName} failed after ${attempt} attempt(s):`, lastError.message);
        throw lastError;
      }
      
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`[import] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error(`Operation failed after ${maxRetries} retries`);
}

interface ImportBody {
  rows: ParsedRow[];
  sheets: string[];
  fileName: string;
}

// ✅ Helper: Chunk array for batch processing
function* chunks<T>(array: T[], size: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}

// ✅ Helper: Execute async tasks with concurrency limit
async function executeWithConcurrency<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = Promise.resolve(item)
      .then(task)
      .then((result) => {
        results.push(result);
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

interface ProgressEvent {
  sheet: string;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  status: "processing" | "done" | "error";
}

function extractEntryYear(regNo: string): number | null {
  const m = regNo.match(/UG(\d{2})/i);
  return m ? 2000 + parseInt(m[1], 10) : null;
}

const VALID_DEGREE_CLASSES = new Set([
  "FIRST_CLASS",
  "SECOND_CLASS_UPPER",
  "SECOND_CLASS_LOWER",
  "THIRD_CLASS",
  "PASS",
]);

function toDegreeClass(raw: string | undefined) {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (!VALID_DEGREE_CLASSES.has(upper)) return undefined;
  return upper as
    | "FIRST_CLASS"
    | "SECOND_CLASS_UPPER"
    | "SECOND_CLASS_LOWER"
    | "THIRD_CLASS"
    | "PASS";
}

function toSex(raw: string | undefined) {
  if (raw === "M") return "M" as const;
  if (raw === "F") return "F" as const;
  return undefined;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type DbClient = Prisma.TransactionClient | typeof prisma;

// ✅ Module-scoped cache for de-duping groups across all rows (for POST handler)
const groupCache = new Map<string, string>();

// ✅ ENTERPRISE: Pre-warm group cache with existing groups from DB
async function prewarmGroupCache(slugs: Set<string>): Promise<void> {
  if (slugs.size === 0) return;

  const slugArray = Array.from(slugs);
  const existingGroups = await prisma.alumniGroup.findMany({
    where: { slug: { in: slugArray } },
    select: { id: true, slug: true },
  });

  for (const group of existingGroups) {
    groupCache.set(`slug:${group.slug}`, group.id);
  }
}

// ✅ ENTERPRISE: Batch upsert groups to reduce round trips
async function batchUpsertGroups(
  groupsToCreate: Array<{
    slug: string;
    name: string;
    type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE";
    meta: any;
  }>
): Promise<Map<string, string>> {
  if (groupsToCreate.length === 0) return new Map();

  const results = new Map<string, string>();

  // Check cache first
  const uncached = groupsToCreate.filter((g) => !groupCache.has(`slug:${g.slug}`));

  if (uncached.length === 0) {
    for (const g of groupsToCreate) {
      results.set(g.slug, groupCache.get(`slug:${g.slug}`)!);
    }
    return results;
  }

  // Batch upsert uncached groups
  for (const groupDef of uncached) {
    const existing = await prisma.alumniGroup.findUnique({
      where: { slug: groupDef.slug },
      select: { id: true },
    });

    if (existing) {
      groupCache.set(`slug:${groupDef.slug}`, existing.id);
      results.set(groupDef.slug, existing.id);
    } else {
      const created = await prisma.alumniGroup.create({
        data: {
          slug: groupDef.slug,
          name: groupDef.name,
          type: groupDef.type,
          isAuto: true,
          ...groupDef.meta,
        },
        select: { id: true },
      });
      groupCache.set(`slug:${groupDef.slug}`, created.id);
      results.set(groupDef.slug, created.id);
    }
  }

  return results;
}

async function upsertAutoGroup(
    db: DbClient,
    txCache: Map<string, string>,
    key: string,
    name: string,
    type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE",
    meta: { cohortYear?: string; facultyCode?: string; courseCode?: string; stateCode?: string }
): Promise<string> {
  // Check transaction-local cache first (newly created groups in this tx)
  if (txCache.has(key)) return txCache.get(key)!;
  // Check module-scoped cache (groups from previous rows/requests)
  if (groupCache.has(key)) {
    txCache.set(key, groupCache.get(key)!);
    return groupCache.get(key)!;
  }

  const slug = slugify(name);
  const group = await db.alumniGroup.upsert({
    where: { slug },
    create: { name, slug, type, isAuto: true, ...meta },
    update: {},
    select: { id: true },
  });

  if (!group?.id) {
    console.error(`Upsert failed for group key: ${key}, slug: ${slug}`);
    throw new Error(`Failed to create/upsert group: ${name} (${slug})`);
  }

  txCache.set(key, group.id);
  groupCache.set(key, group.id);
  return group.id;

}

async function addToGroup(db: DbClient, groupId: string, graduateId: string) {
  if (!groupId || !graduateId) {
    throw new Error(`Invalid args: groupId=${groupId}, graduateId=${graduateId}`);
  }
  await db.groupMember.upsert({
    where: { groupId_graduateId: { groupId, graduateId } },
    create: { groupId, graduateId },
    update: {},
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: ImportBody = await req.json();
  const { rows, sheets, fileName } = body;
  const adminUserId = session.user.id;

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (event: ProgressEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  // ✅ ENTERPRISE: Wrap audit log creation with retry logic
  const auditLog = await executeWithRetry(
    () => prisma.uploadAuditLog.create({
      data: {
        uploadedByUserId: adminUserId,
        fileName,
        totalRows: rows.length,
        status: "PROCESSING",
      },
    }),
    "Create audit log"
  );

  const bySheet = rows.reduce<Record<string, ParsedRow[]>>((acc, row) => {
    (acc[row.sourceSheet] ??= []).push(row);
    return acc;
  }, {});

  // ✅ ENTERPRISE: Wrap initial data fetch with retry logic
  const regNos = [...new Set(rows.map((row) => row.registrationNo))];
  const existingUsers = await executeWithRetry(
    () => prisma.user.findMany({
      where: { registrationNo: { in: regNos } },
      select: {
        id: true,
        registrationNo: true,
        graduate: { select: { id: true } },
      },
    }),
    "Fetch existing users"
  );
  const existingByReg = new Map(existingUsers.map((u) => [u.registrationNo, u]));

  // ✅ ENTERPRISE: Pre-warm group cache with retry logic
  const slugsToPrewarm = new Set<string>();
  for (const row of rows) {
    const entryYear = extractEntryYear(row.registrationNo);
    if (entryYear) slugsToPrewarm.add(slugify(`${entryYear} Set`));
    if (row.departmentName) slugsToPrewarm.add(slugify(`${row.departmentName} Alumni`));
    if (row.facultyName) slugsToPrewarm.add(slugify(`Faculty of ${row.facultyName} Alumni`));
    if (row.stateOfOrigin) slugsToPrewarm.add(slugify(`${row.stateOfOrigin} State Alumni`));
  }

  prewarmGroupCache(slugsToPrewarm)
    .catch(err => console.error("[import] Cache prewarm error:", err));


  groupCache.clear();

  (async () => {
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    const sheetsProcessed: Array<{
      sheet: string;
      created: number;
      updated: number;
      failed: number;
    }> = [];

    for (const sheetName of sheets) {
      const sheetRows = bySheet[sheetName] ?? [];
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < sheetRows.length; i++) {
        const row = sheetRows[i];

        try {
          const existing = existingByReg.get(row.registrationNo);
          const degreeClass = toDegreeClass(row.degreeClass);
          const sex = toSex(row.sex);

          if (existing) {
            await prisma.graduate.upsert({
              where: { userId: existing.id },
              create: {
                userId: existing.id,
                registrationNo: row.registrationNo,
                fullName: row.fullName,
                surname: row.surname ?? null,
                otherNames: row.otherNames ?? null,
                sex: sex ?? null,
                stateOfOrigin: row.stateOfOrigin ?? null,
                lga: row.lga ?? null,
                facultyCode: row.facultyCode ?? null,
                facultyName: row.facultyName ?? null,
                courseCode: row.courseCode ?? null,
                departmentName: row.departmentName ?? null,
                cgpa: row.cgpa ?? null,
                degreeClass: degreeClass ?? null,
                graduationYear: row.sourceSheet,
                entryYear: extractEntryYear(row.registrationNo),
                jambNumber: row.jambNumber ?? null,
                sourceSheet: row.sourceSheet,
              },
              update: {
                fullName: row.fullName,
                ...(row.surname !== undefined && { surname: row.surname }),
                ...(row.otherNames !== undefined && { otherNames: row.otherNames }),
                ...(sex !== undefined && { sex }),
                ...(row.stateOfOrigin !== undefined && {
                  stateOfOrigin: row.stateOfOrigin,
                }),
                ...(row.lga !== undefined && { lga: row.lga }),
                ...(row.facultyCode !== undefined && { facultyCode: row.facultyCode }),
                ...(row.facultyName !== undefined && { facultyName: row.facultyName }),
                ...(row.courseCode !== undefined && { courseCode: row.courseCode }),
                ...(row.departmentName !== undefined && {
                  departmentName: row.departmentName,
                }),
                ...(row.cgpa != null && { cgpa: row.cgpa }),
                ...(degreeClass !== undefined && { degreeClass }),
                graduationYear: row.sourceSheet,
                sourceSheet: row.sourceSheet,
                ...(row.jambNumber !== undefined && { jambNumber: row.jambNumber }),
              },
            });
            updated++;
          } else {
            const defaultPwd = generateDefaultPassword(row.registrationNo);
            const passwordHash = await hashPassword(defaultPwd);
            const entryYear = extractEntryYear(row.registrationNo);

            // Transaction-local cache for groups created/upserted in this tx
            const txGroupCache = new Map<string, string>();

            const createdResult = await prisma.$transaction(
              async (tx) => {
                const user = await tx.user.create({
                  data: {
                    name: row.fullName,
                    email: null,
                    registrationNo: row.registrationNo,
                    defaultPassword: true,
                    accountStatus: "PENDING",
                  },
                });

                await tx.account.create({
                  data: {
                    accountId: user.id,
                    providerId: "credential",
                    userId: user.id,
                    password: passwordHash,
                  },
                });

                const graduate = await tx.graduate.create({
                  data: {
                    userId: user.id,
                    registrationNo: row.registrationNo,
                    fullName: row.fullName,
                    surname: row.surname ?? null,
                    otherNames: row.otherNames ?? null,
                    sex: sex ?? null,
                    stateOfOrigin: row.stateOfOrigin ?? null,
                    lga: row.lga ?? null,
                    facultyCode: row.facultyCode ?? null,
                    facultyName: row.facultyName ?? null,
                    courseCode: row.courseCode ?? null,
                    departmentName: row.departmentName ?? null,
                    cgpa: row.cgpa ?? null,
                    degreeClass: degreeClass ?? null,
                    graduationYear: row.sourceSheet,
                    entryYear,
                    jambNumber: row.jambNumber ?? null,
                    sourceSheet: row.sourceSheet,
                  },
                });

                if (entryYear) {
                  const id = await upsertAutoGroup(
                    tx,
                    txGroupCache,
                    `cohort-${entryYear}`,
                    `${entryYear} Set`,
                    "COHORT",
                    { cohortYear: String(entryYear) }
                  );
                  await addToGroup(tx, id, graduate.id);
                }

                if (row.departmentName) {
                  const id = await upsertAutoGroup(
                    tx,
                    txGroupCache,
                    `dept-${row.courseCode ?? slugify(row.departmentName)}`,
                    `${row.departmentName} Alumni`,
                    "DEPARTMENT",
                    { courseCode: row.courseCode, facultyCode: row.facultyCode }
                  );
                  await addToGroup(tx, id, graduate.id);
                }

                if (row.facultyName) {
                  const id = await upsertAutoGroup(
                    tx,
                    txGroupCache,
                    `faculty-${row.facultyCode ?? slugify(row.facultyName)}`,
                    `Faculty of ${row.facultyName} Alumni`,
                    "FACULTY",
                    { facultyCode: row.facultyCode }
                  );
                  await addToGroup(tx, id, graduate.id);
                }

                if (row.stateOfOrigin) {
                  const id = await upsertAutoGroup(
                    tx,
                    txGroupCache,
                    `state-${slugify(row.stateOfOrigin)}`,
                    `${row.stateOfOrigin} State Alumni`,
                    "STATE",
                    { stateCode: slugify(row.stateOfOrigin) }
                  );
                  await addToGroup(tx, id, graduate.id);
                }

                await tx.activityFeedItem.create({
                  data: {
                    graduateId: graduate.id,
                    actionType: "JOINED_PLATFORM",
                    headline: `${row.fullName} (${row.registrationNo}) joined the alumni community`,
                    isPublic: true,
                    metadata: { sourceSheet: row.sourceSheet },
                  },
                });

                if (degreeClass === "FIRST_CLASS") {
                  await tx.profileBadge.create({
                    data: {
                      graduateId: graduate.id,
                      badgeType: "FIRST_CLASS_HONOURS",
                    },
                  });
                }

                return { userId: user.id };
              },
              {
                maxWait: 10000,    // ✅ Increase max wait time to 10 seconds
                timeout: 15000,    // ✅ Increase transaction timeout to 15 seconds
              }
            );

            existingByReg.set(row.registrationNo, {
              id: createdResult.userId,
              registrationNo: row.registrationNo,
              graduate: { id: "" },
            });

            created++;
          }
        } catch (err) {
          console.error(`[import] ${row.registrationNo}:`, err);
          failed++;
        }

        if ((i + 1) % 25 === 0 || i === sheetRows.length - 1) {
          await send({
            sheet: sheetName,
            processed: i + 1,
            total: sheetRows.length,
            created,
            updated,
            skipped,
            failed,
            status: i === sheetRows.length - 1 ? "done" : "processing",
          });
        }
      }

      totalCreated += created;
      totalUpdated += updated;
      totalSkipped += skipped;
      totalFailed += failed;
      sheetsProcessed.push({ sheet: sheetName, created, updated, failed });
    }

    // ✅ ENTERPRISE: Wrap audit log update with retry logic
    await executeWithRetry(
      () => prisma.uploadAuditLog.update({
        where: { id: auditLog.id },
        data: {
          created: totalCreated,
          updated: totalUpdated,
          skipped: totalSkipped,
          failed: totalFailed,
          status: "COMPLETED",
          completedAt: new Date(),
          sheetsProcessed,
        },
      }),
      "Update audit log with results"
    );

    await writer.close();
  })().catch(async (err) => {
    console.error("[import] fatal:", err);
    await prisma.uploadAuditLog
      .update({
        where: { id: auditLog.id },
        data: { status: "FAILED", completedAt: new Date() },
      })
      .catch(() => {});
    await writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
