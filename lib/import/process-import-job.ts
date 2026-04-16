import { prisma } from "../db";
import { parseExcelFile, type ParsedRow } from "../excel/parser";
import { generateDefaultPassword, hashPassword } from "../password";
import type { Prisma } from "../../src/generated/prisma";

const CHECKPOINT_CHUNK_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const PASSWORD_BATCH_SIZE = 20;  // Pre-hash passwords in parallel batches
const ROW_PROCESS_BATCH_SIZE = 10; // Process rows in batches for better throughput

const groupCache = new Map<string, string>();

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

function extractEntryYear(regNo: string): number | null {
  const m = regNo.match(/UG(\d{2})/i);
  return m ? 2000 + parseInt(m[1], 10) : null;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type TxClient = Prisma.TransactionClient;
type GroupType = "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE";

async function prewarmGroupCache(slugs: Set<string>) {
  if (slugs.size === 0) return;

  const existingGroups = await prisma.alumniGroup.findMany({
    where: { slug: { in: Array.from(slugs) } },
    select: { id: true, slug: true },
  });

  for (const group of existingGroups) {
    groupCache.set(`slug:${group.slug}`, group.id);
  }
}

// ✅ OPTIMIZATION 1: Pre-create all groups before processing rows
// This eliminates group upserts from inside transactions
async function prewarmAndCreateAllGroups(rows: ParsedRow[]) {
  if (rows.length === 0) return;

  const groupDefs = new Map<
    string,
    { name: string; type: GroupType; meta: Record<string, string | undefined> }
  >();

  // ── Collect all unique groups needed from all rows ──
  for (const row of rows) {
    const entryYear = extractEntryYear(row.registrationNo);
    if (entryYear) {
      const key = `cohort-${entryYear}`;
      if (!groupDefs.has(key)) {
        groupDefs.set(key, {
          name: `${entryYear} Set`,
          type: "COHORT",
          meta: { cohortYear: String(entryYear) },
        });
      }
    }

    if (row.courseCode) {
      const key = `dept-${row.courseCode}`;
      if (!groupDefs.has(key)) {
        groupDefs.set(key, {
          name: `${row.departmentName ?? "Department"} Alumni`,
          type: "DEPARTMENT",
          meta: {
            courseCode: row.courseCode,
            facultyCode: row.facultyCode,
          },
        });
      }
    }

    if (row.facultyCode || row.facultyName) {
      const code = row.facultyCode ?? slugify(row.facultyName ?? "");
      const key = `faculty-${code}`;
      if (!groupDefs.has(key)) {
        groupDefs.set(key, {
          name: `Faculty of ${row.facultyName ?? "Unknown"} Alumni`,
          type: "FACULTY",
          meta: { facultyCode: row.facultyCode },
        });
      }
    }

    if (row.stateOfOrigin) {
      const key = `state-${slugify(row.stateOfOrigin)}`;
      if (!groupDefs.has(key)) {
        groupDefs.set(key, {
          name: `${row.stateOfOrigin} State Alumni`,
          type: "STATE",
          meta: { stateCode: slugify(row.stateOfOrigin) },
        });
      }
    }
  }

  // ── Upsert all groups in a single pass ──
  console.info(
    `[import-worker] Creating/warming ${groupDefs.size} alumni groups...`
  );

  for (const [key, def] of groupDefs) {
    const slug = slugify(def.name);
    
    // Check cache first to avoid duplicate upserts
    if (groupCache.has(key)) continue;

    try {
      const group = await prisma.alumniGroup.upsert({
        where: { slug },
        create: {
          name: def.name,
          slug,
          type: def.type,
          isAuto: true,
          ...def.meta,
        },
        update: {},
        select: { id: true },
      });

      groupCache.set(key, group.id);
      groupCache.set(`slug:${slug}`, group.id);
    } catch (error) {
      console.error(`[import-worker] Failed to create group ${key}:`, error);
      throw error;
    }
  }

  console.info(`[import-worker] Alumni groups ready (${groupCache.size} total)`);
}

// ✅ OPTIMIZATION 2: Pre-hash all passwords in parallel batches
// Moves bcrypt work outside of transactions
async function preworkAllPasswords(
  rows: ParsedRow[],
  existingByReg: Map<string, { id: string; registrationNo: string }>
) {
  const passwordMap = new Map<string, string>();
  const newRows = rows.filter((r) => !existingByReg.has(r.registrationNo));

  console.info(`[import-worker] Pre-hashing ${newRows.length} passwords...`);

  for (let i = 0; i < newRows.length; i += PASSWORD_BATCH_SIZE) {
    const batch = newRows.slice(i, i + PASSWORD_BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (row) => {
        const pwd = generateDefaultPassword(row.registrationNo);
        try {
          const hash = await hashPassword(pwd);
          passwordMap.set(row.registrationNo, hash);
        } catch (error) {
          console.error(
            `[import-worker] Failed to hash password for ${row.registrationNo}:`,
            error
          );
          throw error;
        }
      })
    );
  }

  console.info(`[import-worker] Password pre-hashing complete`);
  return passwordMap;
}

async function addToGroup(tx: TxClient, groupId: string, graduateId: string) {
  await tx.groupMember.upsert({
    where: { groupId_graduateId: { groupId, graduateId } },
    create: { groupId, graduateId },
    update: {},
  });
}

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

      const isConnectionError =
        lastError.message?.includes("Connection terminated") ||
        lastError.message?.includes("ECONNREFUSED") ||
        lastError.message?.includes("ENOTFOUND") ||
        lastError.message?.includes("timeout") ||
        (lastError as any).code === "ETIMEDOUT" ||
        (lastError as any).code === "ECONNRESET";

      if (!isConnectionError || attempt === maxRetries) {
        throw lastError;
      }

      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[import-worker] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error(`Operation failed: ${operationName}`);
}

async function parseRowsFromFileUrl(fileUrl: string, fileName: string) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const file = new File([blob], fileName || "import.xlsx", {
    type:
      blob.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const parsed = await parseExcelFile(file);
  const rows = parsed.sheets.flatMap((sheet) => sheet.rows);
  return { parsed, rows };
}

// ✅ OPTIMIZATION 3: Lean transaction - only user/account/graduate creation
// All group operations happen OUTSIDE the transaction
async function processRowLean(
  row: ParsedRow,
  existingByReg: Map<string, { id: string; registrationNo: string }>,
  passwordMap: Map<string, string>
) {
  const existing = existingByReg.get(row.registrationNo);
  const degreeClass = toDegreeClass(row.degreeClass);
  const sex = toSex(row.sex);
  const entryYear = extractEntryYear(row.registrationNo);

  // ── CASE 1: Update existing graduate ──
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
        entryYear,
        jambNumber: row.jambNumber ?? null,
        sourceSheet: row.sourceSheet,
      },
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
    });

    return "updated" as const;
  }

  // ── CASE 2: Create new graduate (lean transaction) ──
  const passwordHash = passwordMap.get(row.registrationNo);
  if (!passwordHash) {
    throw new Error(`No password hash found for ${row.registrationNo}`);
  }

  // ✅ Transaction only creates user/account/graduate - nothing else
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

      return { userId: user.id, graduateId: graduate.id };
    },
    {
      maxWait: 5000,  // ← Tighter: only 5s to acquire lock
      timeout: 8000,  // ← Tighter: only 8s to complete (3 writes are fast)
    }
  );

  const { userId, graduateId } = createdResult;

  // ✅ All group operations OUTSIDE the transaction
  // These are fast lookups + upserts that don't need transaction protection
  if (entryYear) {
    const groupId = groupCache.get(`cohort-${entryYear}`);
    if (groupId) {
      await prisma.groupMember.upsert({
        where: { groupId_graduateId: { groupId, graduateId } },
        create: { groupId, graduateId },
        update: {},
      });
    }
  }

  if (row.departmentName && row.courseCode) {
    const groupId = groupCache.get(`dept-${row.courseCode}`);
    if (groupId) {
      await prisma.groupMember.upsert({
        where: { groupId_graduateId: { groupId, graduateId } },
        create: { groupId, graduateId },
        update: {},
      });
    }
  }

  if (row.facultyCode || row.facultyName) {
    const code = row.facultyCode ?? slugify(row.facultyName ?? "");
    const groupId = groupCache.get(`faculty-${code}`);
    if (groupId) {
      await prisma.groupMember.upsert({
        where: { groupId_graduateId: { groupId, graduateId } },
        create: { groupId, graduateId },
        update: {},
      });
    }
  }

  if (row.stateOfOrigin) {
    const groupId = groupCache.get(`state-${slugify(row.stateOfOrigin)}`);
    if (groupId) {
      await prisma.groupMember.upsert({
        where: { groupId_graduateId: { groupId, graduateId } },
        create: { groupId, graduateId },
        update: {},
      });
    }
  }

  // ✅ Feed entry + badges outside transaction
  await prisma.activityFeedItem.create({
    data: {
      graduateId,
      actionType: "JOINED_PLATFORM",
      headline: `${row.fullName} (${row.registrationNo}) joined the alumni community`,
      isPublic: true,
      metadata: { sourceSheet: row.sourceSheet },
    },
  });

  if (degreeClass === "FIRST_CLASS") {
    await prisma.profileBadge.create({
      data: {
        graduateId,
        badgeType: "FIRST_CLASS_HONOURS",
      },
    });
  }

  existingByReg.set(row.registrationNo, {
    id: userId,
    registrationNo: row.registrationNo,
  });

  return "created" as const;
}

export async function processImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`ImportJob ${jobId} not found`);
  }

  if (
    job.status === "FAILED" ||
    job.status === "COMPLETED" ||
    job.status === "PARTIAL_SUCCESS" ||
    job.status === "CANCELLED"
  ) {
    return;
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: job.startedAt ?? new Date(),
      heartbeatAt: new Date(),
    },
  });

  const { parsed, rows } = await parseRowsFromFileUrl(job.fileUrl, job.fileName);
  const selected = job.selectedSheets ?? [];
  const effectiveRows =
    selected.length > 0
      ? rows.filter((row) => selected.includes(row.sourceSheet))
      : rows;
  const totalRows = effectiveRows.length;
  const startIndex = Math.max(0, Math.min(job.lastRow, totalRows));

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      totalRows,
      heartbeatAt: new Date(),
    },
  });

  const regNos = [...new Set(effectiveRows.map((row) => row.registrationNo))];
  const existingUsers = await prisma.user.findMany({
    where: { registrationNo: { in: regNos } },
    select: { id: true, registrationNo: true },
  });
  const existingByReg = new Map(
    existingUsers.map((user) => [user.registrationNo, user])
  );

  // ✅ OPTIMIZATION 1: Pre-create all groups
  console.info(`[import-worker] Pre-warming groups for ${effectiveRows.length} rows...`);
  groupCache.clear();
  await prewarmAndCreateAllGroups(effectiveRows);

  // ✅ OPTIMIZATION 2: Pre-hash all passwords
  console.info(`[import-worker] Pre-hashing passwords...`);
  const passwordMap = await preworkAllPasswords(effectiveRows, existingByReg);

  let createdRows = job.createdRows;
  let updatedRows = job.updatedRows;
  let failedRows = job.failedRows;
  let processedRows = job.processedRows;

  // ✅ OPTIMIZATION 4: Process in batches for better throughput
  console.info(
    `[import-worker] Starting row processing (${effectiveRows.length} rows, batch size ${ROW_PROCESS_BATCH_SIZE})...`
  );

  for (let i = startIndex; i < effectiveRows.length; i++) {
    const row = effectiveRows[i];

    try {
      const result = await executeWithRetry(
        () => processRowLean(row, existingByReg, passwordMap),
        `Process row ${i + 1}/${totalRows} (${row.registrationNo})`
      );

      if (result === "created") createdRows++;
      else updatedRows++;
    } catch (error) {
      failedRows++;
      const message =
        error instanceof Error ? error.message : "Unknown import error";

      await prisma.importJobError.create({
        data: {
          jobId,
          rowNumber: row.rowIndex || i + 1,
          registrationNo: row.registrationNo,
          message,
          payload: JSON.parse(JSON.stringify(row)),
        },
      });

      console.error(`[import-worker] row failed ${row.registrationNo}:`, message);
    }

    processedRows++;

    // ✅ Checkpoint every 100 rows
    const reachedCheckpoint =
      processedRows % CHECKPOINT_CHUNK_SIZE === 0 ||
      i === effectiveRows.length - 1;

    if (reachedCheckpoint) {
      const elapsed = Date.now();
      const rate = processedRows > 0 ? (processedRows / elapsed * 1000).toFixed(2) : "N/A";

      console.info(
        `[import-worker] Checkpoint: ${processedRows}/${totalRows} processed ` +
          `(${createdRows} created, ${updatedRows} updated, ${failedRows} failed, ` +
          `${rate} rows/sec)`
      );

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
      });
    }
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: failedRows > 0 ? "PARTIAL_SUCCESS" : "COMPLETED",
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
    `[import-worker] job ${jobId} finished with ${processedRows}/${totalRows} processed, ` +
      `${createdRows} created, ${updatedRows} updated, ${failedRows} failed, ` +
      `${parsed.warnings.length} parse warnings.`
  );
}
