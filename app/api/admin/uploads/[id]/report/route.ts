import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { csvLine } from "@/lib/csv";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const log = await prisma.uploadAuditLog.findUnique({ where: { id } });
  if (!log) {
    return NextResponse.json({ error: "Upload log not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: log.uploadedByUserId },
    select: { id: true, name: true, email: true, registrationNo: true },
  });

  const sheetSummary = Array.isArray(log.sheetsProcessed)
    ? log.sheetsProcessed
    : [];

  const summaryHeader = ["Field", "Value"];
  const summaryRows: string[] = [
    csvLine(["Upload ID", log.id]),
    csvLine(["File Name", log.fileName]),
    csvLine(["Status", log.status]),
    csvLine(["Total Rows", log.totalRows]),
    csvLine(["Created", log.created]),
    csvLine(["Updated", log.updated]),
    csvLine(["Skipped", log.skipped]),
    csvLine(["Failed", log.failed]),
    csvLine(["Started At", log.startedAt]),
    csvLine(["Completed At", log.completedAt]),
    csvLine(["Uploader Name", user?.name ?? ""]),
    csvLine(["Uploader Email", user?.email ?? ""]),
    csvLine(["Uploader Registration No", user?.registrationNo ?? ""]),
    csvLine(["Notes", log.notes ?? ""]),
  ];

  const sheetHeader = ["Sheet", "Created", "Updated", "Failed"];
  const sheetRows = sheetSummary.map((sheet) => {
    const row = sheet as Record<string, unknown>;
    return csvLine([
      row.sheet ?? "",
      row.created ?? 0,
      row.updated ?? 0,
      row.failed ?? 0,
    ]);
  });

  const footer = [
    "",
    csvLine(["Info", "Row-level failure details are not stored yet in the current schema."]),
  ];

  const csv = [
    csvLine(summaryHeader),
    ...summaryRows,
    "",
    csvLine(sheetHeader),
    ...sheetRows,
    ...footer,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="upload-report-${log.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
