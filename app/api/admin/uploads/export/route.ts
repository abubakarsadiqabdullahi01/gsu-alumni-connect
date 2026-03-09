import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { csvLine } from "@/lib/csv";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.uploadAuditLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 2000,
  });

  const uploaderIds = [...new Set(logs.map((log) => log.uploadedByUserId))];
  const users = await prisma.user.findMany({
    where: { id: { in: uploaderIds } },
    select: { id: true, name: true, email: true, registrationNo: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const header = [
    "Upload ID",
    "File Name",
    "Status",
    "Total Rows",
    "Created",
    "Updated",
    "Skipped",
    "Failed",
    "Started At",
    "Completed At",
    "Uploader ID",
    "Uploader Name",
    "Uploader Email",
    "Uploader Registration No",
    "Notes",
  ];

  const rows = logs.map((log) => {
    const user = userById.get(log.uploadedByUserId);
    return csvLine([
      log.id,
      log.fileName,
      log.status,
      log.totalRows,
      log.created,
      log.updated,
      log.skipped,
      log.failed,
      log.startedAt,
      log.completedAt,
      log.uploadedByUserId,
      user?.name ?? "",
      user?.email ?? "",
      user?.registrationNo ?? "",
      log.notes ?? "",
    ]);
  });

  const csv = [csvLine(header), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="upload-log-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
