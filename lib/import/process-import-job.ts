import { prisma } from "../db";
import { parseExcelFile, type ParsedRow } from "../excel/parser";
import { generateDefaultPassword, hashPassword } from "../password";
import type { Prisma } from "../../src/generated/prisma";

const CHECKPOINT_CHUNK_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
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

async function upsertAutoGroup(
  tx: TxClient,
  txCache: Map<string, string>,
  key: string,
  name: string,
  type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE",
  meta: { cohortYear?: string; facultyCode?: string; courseCode?: string; stateCode?: string }
) {
  if (txCache.has(key)) return txCache.get(key)!;
  if (groupCache.has(key)) {
    const id = groupCache.get(key)!;
    txCache.set(key, id);
    return id;
  }

  const slug = slugify(name);
  const group = await tx.alumniGroup.upsert({
    where: { slug },
    create: { name, slug, type, isAuto: true, ...meta },
    update: {},
    select: { id: true },
  });

  txCache.set(key, group.id);
  groupCache.set(key, group.id);
  return group.id;
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
    type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const parsed = await parseExcelFile(file);
  const rows = parsed.sheets.flatMap((sheet) => sheet.rows);
  return { parsed, rows };
}

async function processRow(
  row: ParsedRow,
  existingByReg: Map<string, { id: string; registrationNo: string }>
) {
  const existing = existingByReg.get(row.registrationNo);
  const degreeClass = toDegreeClass(row.degreeClass);
  const sex = toSex(row.sex);

  const upsertGraduateForUser = async (userId: string) => {
    await prisma.graduate.upsert({
      where: { userId },
      create: {
        userId,
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
  };

  if (existing) {
    await upsertGraduateForUser(existing.id);
    return "updated" as const;
  }

  const defaultPwd = generateDefaultPassword(row.registrationNo);
  const passwordHash = await hashPassword(defaultPwd);
  const entryYear = extractEntryYear(row.registrationNo);

  try {
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

      const txGroupCache = new Map<string, string>();

      if (entryYear) {
        const groupId = await upsertAutoGroup(
          tx,
          txGroupCache,
          `cohort-${entryYear}`,
          `${entryYear} Set`,
          "COHORT",
          { cohortYear: String(entryYear) }
        );
        await addToGroup(tx, groupId, graduate.id);
      }

      if (row.departmentName) {
        const groupId = await upsertAutoGroup(
          tx,
          txGroupCache,
          `dept-${row.courseCode ?? slugify(row.departmentName)}`,
          `${row.departmentName} Alumni`,
          "DEPARTMENT",
          { courseCode: row.courseCode, facultyCode: row.facultyCode }
        );
        await addToGroup(tx, groupId, graduate.id);
      }

      if (row.facultyName) {
        const groupId = await upsertAutoGroup(
          tx,
          txGroupCache,
          `faculty-${row.facultyCode ?? slugify(row.facultyName)}`,
          `Faculty of ${row.facultyName} Alumni`,
          "FACULTY",
          { facultyCode: row.facultyCode }
        );
        await addToGroup(tx, groupId, graduate.id);
      }

      if (row.stateOfOrigin) {
        const groupId = await upsertAutoGroup(
          tx,
          txGroupCache,
          `state-${slugify(row.stateOfOrigin)}`,
          `${row.stateOfOrigin} State Alumni`,
          "STATE",
          { stateCode: slugify(row.stateOfOrigin) }
        );
        await addToGroup(tx, groupId, graduate.id);
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
        maxWait: 10000,
        timeout: 15000,
      }
    );

    existingByReg.set(row.registrationNo, {
      id: createdResult.userId,
      registrationNo: row.registrationNo,
    });
    return "created" as const;
  } catch (error) {
    // Idempotency fallback: another run/process may have created this user concurrently.
    if ((error as any)?.code === "P2002") {
      const user = await prisma.user.findUnique({
        where: { registrationNo: row.registrationNo },
        select: { id: true, registrationNo: true },
      });
      if (user) {
        existingByReg.set(row.registrationNo, user);
        await upsertGraduateForUser(user.id);
        return "updated" as const;
      }
    }
    throw error;
  }
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

  const slugsToPrewarm = new Set<string>();
  for (const row of effectiveRows) {
    const entryYear = extractEntryYear(row.registrationNo);
    if (entryYear) slugsToPrewarm.add(slugify(`${entryYear} Set`));
    if (row.departmentName) slugsToPrewarm.add(slugify(`${row.departmentName} Alumni`));
    if (row.facultyName) slugsToPrewarm.add(slugify(`Faculty of ${row.facultyName} Alumni`));
    if (row.stateOfOrigin) slugsToPrewarm.add(slugify(`${row.stateOfOrigin} State Alumni`));
  }
  groupCache.clear();
  await prewarmGroupCache(slugsToPrewarm);

  let createdRows = job.createdRows;
  let updatedRows = job.updatedRows;
  let failedRows = job.failedRows;
  let processedRows = job.processedRows;

  for (let i = startIndex; i < effectiveRows.length; i++) {
    const row = effectiveRows[i];

    try {
      const result = await executeWithRetry(
        () => processRow(row, existingByReg),
        `Process row ${row.registrationNo}`
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

    const reachedCheckpoint =
      processedRows % CHECKPOINT_CHUNK_SIZE === 0 || i === effectiveRows.length - 1;

    if (reachedCheckpoint) {
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
