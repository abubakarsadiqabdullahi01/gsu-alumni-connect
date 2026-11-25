import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isSessionOk } from "@/lib/api-middleware";
import { prisma } from "@/lib/db";

/** Reports for the Secretariat, newest first, with a preview of what was reported. */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request.headers, "AdminReportsAPI");
  if (!isSessionOk(result)) return result.error;

  const status = request.nextUrl.searchParams.get("status") ?? "OPEN";
  const reports = await prisma.contentReport.findMany({
    where: status === "ALL" ? {} : { status: status as "OPEN" | "ACTIONED" | "DISMISSED" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { fullName: true, registrationNo: true } },
      subject: { select: { id: true, fullName: true, registrationNo: true, user: { select: { accountStatus: true } }, _count: { select: { reportsAgainst: true } } } },
    },
  });

  const idsOf = (type: string) => reports.filter((r) => r.targetType === type).map((r) => r.targetId);
  const [posts, comments, messages] = await Promise.all([
    prisma.groupPost.findMany({ where: { id: { in: idsOf("POST") } }, select: { id: true, content: true, isDeleted: true } }),
    prisma.postComment.findMany({ where: { id: { in: idsOf("COMMENT") } }, select: { id: true, content: true, isDeleted: true } }),
    prisma.message.findMany({ where: { id: { in: idsOf("MESSAGE") } }, select: { id: true, body: true, isDeleted: true } }),
  ]);
  const preview = new Map<string, { text: string; removed: boolean }>([
    ...posts.map((p) => [p.id, { text: p.content, removed: p.isDeleted }] as const),
    ...comments.map((c) => [c.id, { text: c.content, removed: c.isDeleted }] as const),
    ...messages.map((m) => [m.id, { text: m.body, removed: m.isDeleted }] as const),
  ]);

  return NextResponse.json({
    items: reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reporter: r.reporter,
      subject: r.subject
        ? { id: r.subject.id, fullName: r.subject.fullName, registrationNo: r.subject.registrationNo, accountStatus: r.subject.user.accountStatus, totalReports: r.subject._count.reportsAgainst }
        : null,
      preview: r.targetType === "PROFILE" ? null : (preview.get(r.targetId) ?? { text: "(no longer exists)", removed: true }),
    })),
  });
}
