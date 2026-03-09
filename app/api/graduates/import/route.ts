import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateDefaultPassword, hashPassword } from "@/lib/password";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/src/generated/prisma";
import type { ParsedRow } from "@/lib/excel/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImportBody {
  rows: ParsedRow[];
  sheets: string[];
  fileName: string;
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

const groupCache = new Map<string, string>();

async function upsertAutoGroup(
  db: DbClient,
  key: string,
  name: string,
  type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE",
  meta: {
    cohortYear?: string;
    facultyCode?: string;
    courseCode?: string;
    stateCode?: string;
  }
): Promise<string> {
  if (groupCache.has(key)) return groupCache.get(key)!;

  const slug = slugify(name);
  const group = await db.alumniGroup.upsert({
    where: { slug },
    create: { name, slug, type, isAuto: true, ...meta },
    update: {},
    select: { id: true },
  });

  groupCache.set(key, group.id);
  return group.id;
}

async function addToGroup(db: DbClient, groupId: string, graduateId: string) {
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

  const auditLog = await prisma.uploadAuditLog.create({
    data: {
      uploadedByUserId: adminUserId,
      fileName,
      totalRows: rows.length,
      status: "PROCESSING",
    },
  });

  const bySheet = rows.reduce<Record<string, ParsedRow[]>>((acc, row) => {
    (acc[row.sourceSheet] ??= []).push(row);
    return acc;
  }, {});

  const regNos = [...new Set(rows.map((row) => row.registrationNo))];
  const existingUsers = await prisma.user.findMany({
    where: { registrationNo: { in: regNos } },
    select: {
      id: true,
      registrationNo: true,
      graduate: { select: { id: true } },
    },
  });
  const existingByReg = new Map(existingUsers.map((u) => [u.registrationNo, u]));

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

            const createdResult = await prisma.$transaction(async (tx) => {
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
            });

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

    await prisma.uploadAuditLog.update({
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
    });

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
