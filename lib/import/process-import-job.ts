import { prisma } from "../db";
import { parseExcelFile, type ParsedRow } from "../excel/parser";
import { generateDefaultPassword, hashPassword } from "../password";
import type { Prisma } from "../../src/generated/prisma";

// ── Tuning constants ───────────────────────────────────────────────────────────
const CHECKPOINT_EVERY = 50;        // Write progress to DB every N rows
const PASSWORD_BATCH_SIZE = 20;     // Hash this many passwords in parallel
const TX_MAX_WAIT_MS = 5_000;       // Prisma transaction maxWait
const TX_TIMEOUT_MS = 10_000;       // Prisma transaction timeout (lean tx = fast)
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

// ── Module-scoped group cache (survives across rows in one invocation) ─────────
const groupCache = new Map<string, string>(); // key → groupId

// ── Types ──────────────────────────────────────────────────────────────────────
type TxClient = Prisma.TransactionClient;
type GroupType = "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE";

const VALID_DEGREE_CLASSES = new Set([
  "FIRST_CLASS",
  "SECOND_CLASS_UPPER",
  "SECOND_CLASS_LOWER",
  "THIRD_CLASS",
  "PASS",
]);

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDegreeClass(raw: string | undefined) {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return VALID_DEGREE_CLASSES.has(upper)
      ? (upper as "FIRST_CLASS" | "SECOND_CLASS_UPPER" | "SECOND_CLASS_LOWER" | "THIRD_CLASS" | "PASS")
      : undefined;
}

function toSex(raw: string | undefined) {
  if (raw === "M") return "M" as const;
  if (raw === "F") return "F" as const;
  return undefined;
}

function extractEntryYear(regNo: string): number | null {
  const m = regNo.match(/UG(\d{2})/i);
  return m ? 2000 + parseInt(m[1], 10) : null;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err as Error;
      const isRetryable =
          lastErr.message?.includes("Connection terminated") ||
          lastErr.message?.includes("timeout") ||
          lastErr.message?.includes("ECONNRESET") ||
          (lastErr as any).code === "ETIMEDOUT";
      if (!isRetryable || attempt === MAX_RETRIES) throw lastErr;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`[import-worker] ${label} attempt ${attempt} failed, retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr!;
}

// ── Step 1: Pre-create all unique groups before processing any rows ───────────
// This eliminates group upserts from inside per-row transactions, which was
// the main source of slow/timed-out transactions.
async function prewarmGroups(rows: ParsedRow[]): Promise<void> {
  groupCache.clear();

  // Collect all unique group definitions
  const defs = new Map<
      string,
      { name: string; type: GroupType; meta: Record<string, string | undefined> }
  >();

  for (const row of rows) {
    const entryYear = extractEntryYear(row.registrationNo);
    if (entryYear) {
      const key = `cohort-${entryYear}`;
      defs.set(key, {
        name: `${entryYear} Set`,
        type: "COHORT",
        meta: { cohortYear: String(entryYear) },
      });
    }
    if (row.departmentName) {
      const key = `dept-${row.courseCode ?? slugify(row.departmentName)}`;
      defs.set(key, {
        name: `${row.departmentName} Alumni`,
        type: "DEPARTMENT",
        meta: { courseCode: row.courseCode, facultyCode: row.facultyCode },
      });
    }
    if (row.facultyName) {
      const key = `faculty-${row.facultyCode ?? slugify(row.facultyName)}`;
      defs.set(key, {
        name: `Faculty of ${row.facultyName} Alumni`,
        type: "FACULTY",
        meta: { facultyCode: row.facultyCode },
      });
    }
    if (row.stateOfOrigin) {
      const key = `state-${slugify(row.stateOfOrigin)}`;
      defs.set(key, {
        name: `${row.stateOfOrigin} State Alumni`,
        type: "STATE",
        meta: { stateCode: slugify(row.stateOfOrigin) },
      });
    }
  }

  console.info(`[import-worker] Creating/warming ${defs.size} alumni groups...`);

  // Upsert each group outside any transaction
  for (const [key, def] of defs) {
    const slug = slugify(def.name);
    const group = await withRetry(
        () =>
            prisma.alumniGroup.upsert({
              where: { slug },
              create: { name: def.name, slug, type: def.type, isAuto: true, ...def.meta },
              update: {},
              select: { id: true },
            }),
        `upsert group ${key}`
    );
    groupCache.set(key, group.id);
  }

  console.info(`[import-worker] ${defs.size} groups ready`);
}

// ── Step 2: Pre-hash all passwords for new graduates in parallel batches ──────
async function prehashPasswords(rows: ParsedRow[], existingByReg: Map<string, { id: string }>): Promise<Map<string, string>> {
  const newRows = rows.filter((r) => !existingByReg.has(r.registrationNo));
  console.info(`[import-worker] Pre-hashing ${newRows.length} passwords...`);

  const passwordMap = new Map<string, string>();

  for (let i = 0; i < newRows.length; i += PASSWORD_BATCH_SIZE) {
    const batch = newRows.slice(i, i + PASSWORD_BATCH_SIZE);
    await Promise.all(
        batch.map(async (row) => {
          const pwd = generateDefaultPassword(row.registrationNo);
          passwordMap.set(row.registrationNo, await hashPassword(pwd));
        })
    );
  }

  console.info(`[import-worker] Password pre-hashing complete`);
  return passwordMap;
}

// ── Step 3: Process a single row ──────────────────────────────────────────────
async function processRow(
    row: ParsedRow,
    existingByReg: Map<string, { id: string; registrationNo: string }>,
    passwordMap: Map<string, string>
): Promise<"created" | "updated"> {
  const existing = existingByReg.get(row.registrationNo);
  const degreeClass = toDegreeClass(row.degreeClass);
  const sex = toSex(row.sex);
  const entryYear = extractEntryYear(row.registrationNo);

  const graduateData = {
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
  };

  // ── UPDATE path: graduate already exists ──────────────────────────────────
  if (existing) {
    await withRetry(
        () =>
            prisma.graduate.upsert({
              where: { userId: existing.id },
              create: { userId: existing.id, ...graduateData },
              update: {
                fullName: row.fullName,
                ...(row.surname !== undefined && { surname: row.surname }),
                ...(row.otherNames !== undefined && { otherNames: row.otherNames }),
                ...(sex !== undefined && { sex }),
                ...(row.stateOfOrigin !== undefined && { stateOfOrigin: row.stateOfOrigin }),
                ...(row.lga !== undefined && { lga: row.lga }),
                ...(row.facultyCode !== undefined && { facultyCode: row.facultyCode }),
                ...(row.facultyName !== undefined && { facultyName: row.facultyName }),
                ...(row.courseCode !== undefined && { courseCode: row.courseCode }),
                ...(row.departmentName !== undefined && { departmentName: row.departmentName }),
                ...(row.cgpa != null && { cgpa: row.cgpa }),
                ...(degreeClass !== undefined && { degreeClass }),
                graduationYear: row.sourceSheet,
                sourceSheet: row.sourceSheet,
                ...(row.jambNumber !== undefined && { jambNumber: row.jambNumber }),
              },
            }),
        `update graduate ${row.registrationNo}`
    );
    return "updated";
  }

  // ── CREATE path: new graduate ──────────────────────────────────────────────
  const passwordHash = passwordMap.get(row.registrationNo);
  if (!passwordHash) {
    throw new Error(`No pre-hashed password found for ${row.registrationNo}`);
  }

  // LEAN transaction: only user + account + graduate (no group upserts inside tx)
  const { userId, graduateId } = await withRetry(
      () =>
          prisma.$transaction(
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
                  data: { userId: user.id, ...graduateData },
                });

                return { userId: user.id, graduateId: graduate.id };
              },
              { maxWait: TX_MAX_WAIT_MS, timeout: TX_TIMEOUT_MS }
          ),
      `create user ${row.registrationNo}`
  );

  // Update local lookup map so duplicate reg numbers in the same file are handled
  existingByReg.set(row.registrationNo, { id: userId, registrationNo: row.registrationNo });

  // ── Group memberships (outside transaction — groups already exist) ──────────
  const groupMemberships: Array<{ key: string }> = [];
  if (entryYear) groupMemberships.push({ key: `cohort-${entryYear}` });
  if (row.departmentName) groupMemberships.push({ key: `dept-${row.courseCode ?? slugify(row.departmentName)}` });
  if (row.facultyName) groupMemberships.push({ key: `faculty-${row.facultyCode ?? slugify(row.facultyName)}` });
  if (row.stateOfOrigin) groupMemberships.push({ key: `state-${slugify(row.stateOfOrigin)}` });

  for (const { key } of groupMemberships) {
    const groupId = groupCache.get(key);
    if (!groupId) continue;
    await prisma.groupMember.upsert({
      where: { groupId_graduateId: { groupId, graduateId } },
      create: { groupId, graduateId },
      update: {},
    }).catch((err) => {
      console.warn(`[import-worker] groupMember upsert failed for ${row.registrationNo} / ${key}:`, err.message);
    });
  }

  // ── Activity feed ──────────────────────────────────────────────────────────
  await prisma.activityFeedItem.create({
    data: {
      graduateId,
      actionType: "JOINED_PLATFORM",
      headline: `${row.fullName} (${row.registrationNo}) joined the alumni community`,
      isPublic: true,
      metadata: { sourceSheet: row.sourceSheet },
    },
  }).catch(() => {}); // Non-critical — don't fail the row

  // ── Badge ──────────────────────────────────────────────────────────────────
  if (degreeClass === "FIRST_CLASS") {
    await prisma.profileBadge.create({
      data: { graduateId, badgeType: "FIRST_CLASS_HONOURS" },
    }).catch(() => {}); // Non-critical
  }

  return "created";
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function processImportJob(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`ImportJob ${jobId} not found`);

  // Skip if already in a terminal state (e.g. duplicate cron invocation)
  if (["FAILED", "COMPLETED", "PARTIAL_SUCCESS", "CANCELLED"].includes(job.status)) {
    console.info(`[import-worker] job ${jobId} already in terminal state ${job.status}, skipping`);
    return;
  }

  // ── Download + parse file ──────────────────────────────────────────────────
  const { parsed, rows } = await withRetry(
      () => parseRowsFromFileUrl(job.fileUrl, job.fileName),
      `download file for job ${jobId}`
  );

  const selected = job.selectedSheets ?? [];
  const effectiveRows =
      selected.length > 0 ? rows.filter((r) => selected.includes(r.sourceSheet)) : rows;
  const totalRows = effectiveRows.length;
  const startIndex = Math.max(0, Math.min(job.lastRow ?? 0, totalRows));

  // Update total so the UI progress bar is accurate
  await prisma.importJob.update({
    where: { id: jobId },
    data: { totalRows, heartbeatAt: new Date() },
  });

  // ── Pre-load existing users (avoid per-row DB lookups) ────────────────────
  const regNos = [...new Set(effectiveRows.map((r) => r.registrationNo))];
  const existingUsers = await prisma.user.findMany({
    where: { registrationNo: { in: regNos } },
    select: { id: true, registrationNo: true },
  });
  const existingByReg = new Map(existingUsers.map((u) => [u.registrationNo, u]));

  // ── Pre-warm all groups ────────────────────────────────────────────────────
  await prewarmGroups(effectiveRows);

  // ── Pre-hash passwords for new rows ───────────────────────────────────────
  const passwordMap = await prehashPasswords(effectiveRows, existingByReg);

  // ── Process rows ──────────────────────────────────────────────────────────
  let createdRows = job.createdRows ?? 0;
  let updatedRows = job.updatedRows ?? 0;
  let failedRows = job.failedRows ?? 0;
  let processedRows = job.processedRows ?? 0;

  console.info(`[import-worker] Processing ${totalRows} rows (resuming from row ${startIndex})...`);

  for (let i = startIndex; i < effectiveRows.length; i++) {
    const row = effectiveRows[i];

    try {
      const result = await processRow(row, existingByReg, passwordMap);
      if (result === "created") createdRows++;
      else updatedRows++;
    } catch (err) {
      failedRows++;
      const message = err instanceof Error ? err.message : "Unknown error";

      // Check for idempotency (race: another job created this user)
      if ((err as any)?.code === "P2002") {
        const existing = await prisma.user.findUnique({
          where: { registrationNo: row.registrationNo },
          select: { id: true, registrationNo: true },
        });
        if (existing) {
          existingByReg.set(row.registrationNo, existing);
          failedRows--; // Not really a failure
          updatedRows++;
          processedRows++;
          continue;
        }
      }

      await prisma.importJobError.create({
        data: {
          jobId,
          rowNumber: (row as any).rowIndex ?? i + 1,
          registrationNo: row.registrationNo,
          message,
          payload: JSON.parse(JSON.stringify(row)),
        },
      }).catch(() => {});

      console.error(`[import-worker] row failed ${row.registrationNo}: ${message}`);
    }

    processedRows++;

    // Checkpoint: write progress to DB so the UI shows live updates
    const isLast = i === effectiveRows.length - 1;
    if (processedRows % CHECKPOINT_EVERY === 0 || isLast) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "RUNNING",
          processedRows,
          createdRows,
          updatedRows,
          failedRows,
          lastRow: i + 1,
          heartbeatAt: new Date(),
        },
      }).catch((err) => {
        console.error(`[import-worker] checkpoint write failed: ${err.message}`);
      });
    }
  }

  // ── Finalize ───────────────────────────────────────────────────────────────
  const finalStatus = failedRows > 0 ? "PARTIAL_SUCCESS" : "COMPLETED";
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      totalRows,
      processedRows,
      createdRows,
      updatedRows,
      failedRows,
      lastRow: totalRows,
      completedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });

  console.info(
      `[import-worker] job ${jobId} → ${finalStatus} | ` +
      `${processedRows}/${totalRows} processed, ` +
      `${createdRows} created, ${updatedRows} updated, ${failedRows} failed, ` +
      `${parsed.warnings.length} parse warnings`
  );
}

// ── File download helper ───────────────────────────────────────────────────────
async function parseRowsFromFileUrl(fileUrl: string, fileName: string) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const file = new File([blob], fileName || "import.xlsx", {
    type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const parsed = await parseExcelFile(file);
  const rows = parsed.sheets.flatMap((s) => s.rows);
  return { parsed, rows };
}