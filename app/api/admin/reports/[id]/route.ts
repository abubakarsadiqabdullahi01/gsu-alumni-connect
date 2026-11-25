import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isSessionOk } from "@/lib/api-middleware";
import { prisma } from "@/lib/db";

/**
 * The Secretariat's decision on a report:
 * - dismiss: nothing wrong
 * - remove: hide the post, comment or message (a profile is hidden from the directory)
 * - suspend: remove, and suspend the member who wrote it (signs them out; sign-in refused)
 * Every open report on the same target is closed with the same decision.
 */
const bodySchema = z.object({
  action: z.enum(["dismiss", "remove", "suspend"]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin(request.headers, "AdminReportActionAPI");
  if (!isSessionOk(result)) return result.error;
  const adminId = result.session.user.id;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
  const { action, note } = parsed.data;

  const { id } = await ctx.params;
  const report = await prisma.contentReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (action !== "dismiss") {
      const t = report.targetId;
      if (report.targetType === "POST") await tx.groupPost.updateMany({ where: { id: t }, data: { isDeleted: true } });
      if (report.targetType === "COMMENT") await tx.postComment.updateMany({ where: { id: t }, data: { isDeleted: true } });
      if (report.targetType === "MESSAGE") await tx.message.updateMany({ where: { id: t }, data: { isDeleted: true, deletedAt: now } });
      if (report.targetType === "PROFILE") await tx.graduate.updateMany({ where: { id: t }, data: { showInDirectory: false } });
    }
    if (action === "suspend" && report.subjectId) {
      const subject = await tx.graduate.findUnique({ where: { id: report.subjectId }, select: { userId: true } });
      if (subject) {
        await tx.user.update({ where: { id: subject.userId }, data: { accountStatus: "SUSPENDED" } });
        await tx.session.deleteMany({ where: { userId: subject.userId } });
      }
    }
    const resolution = { dismiss: "Dismissed", remove: "Content removed", suspend: "Content removed; member suspended" }[action];
    await tx.contentReport.updateMany({
      where: { targetType: report.targetType, targetId: report.targetId, status: "OPEN" },
      data: {
        status: action === "dismiss" ? "DISMISSED" : "ACTIONED",
        reviewedAt: now,
        reviewedBy: adminId,
        resolution: note ? `${resolution}. ${note}` : resolution,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
