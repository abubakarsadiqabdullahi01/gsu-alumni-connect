import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * A member reports a post, comment, message or profile. The Secretariat is
 * emailed and reviews it at /admin/reports. Reporting the same thing twice is
 * a no-op, not an error.
 */
const bodySchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "MESSAGE", "PROFILE"]),
  targetId: z.string().min(1).max(64),
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "IMPERSONATION", "SCAM", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
});

const DAILY_LIMIT = 20;
const MODERATION_EMAIL = process.env.MODERATION_EMAIL?.trim() || "alumni@gsu.edu.ng";

/** Who is responsible for the target, or null when the reporter can't see it. */
async function subjectOf(targetType: string, targetId: string, reporterId: string): Promise<string | null> {
  switch (targetType) {
    case "POST": {
      const post = await prisma.groupPost.findFirst({ where: { id: targetId, isDeleted: false }, select: { authorId: true } });
      return post?.authorId ?? null;
    }
    case "COMMENT": {
      const comment = await prisma.postComment.findFirst({ where: { id: targetId, isDeleted: false }, select: { authorId: true } });
      return comment?.authorId ?? null;
    }
    case "MESSAGE": {
      // Only someone in the conversation can have seen the message.
      const message = await prisma.message.findFirst({
        where: { id: targetId, isDeleted: false, conversation: { participants: { some: { graduateId: reporterId } } } },
        select: { senderId: true },
      });
      return message?.senderId ?? null;
    }
    case "PROFILE": {
      const graduate = await prisma.graduate.findUnique({ where: { id: targetId }, select: { id: true } });
      return graduate?.id ?? null;
    }
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a reason for the report." }, { status: 400 });
  const { targetType, targetId, reason, details } = parsed.data;

  const reporter = await prisma.graduate.findUnique({ where: { userId: session.user.id }, select: { id: true, fullName: true, registrationNo: true } });
  if (!reporter) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

  const subjectId = await subjectOf(targetType, targetId, reporter.id);
  if (!subjectId) return NextResponse.json({ error: "That content is no longer available." }, { status: 404 });
  if (subjectId === reporter.id) return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });

  const existing = await prisma.contentReport.findUnique({
    where: { reporterId_targetType_targetId: { reporterId: reporter.id, targetType, targetId } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyReported: true });

  const today = await prisma.contentReport.count({
    where: { reporterId: reporter.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= DAILY_LIMIT) {
    return NextResponse.json({ error: "You have sent a lot of reports today. Please email alumni@gsu.edu.ng." }, { status: 429 });
  }

  const report = await prisma.contentReport.create({
    data: { reporterId: reporter.id, targetType, targetId, subjectId, reason, details: details || null },
    select: { id: true },
  });

  const site = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.gsualumni.org.ng";
  const kind = targetType.toLowerCase();
  sendEmail({
    to: MODERATION_EMAIL,
    subject: `New report: ${kind} (${reason.toLowerCase()})`,
    text: `A member reported a ${kind} for ${reason.toLowerCase()}.\n\nReview it within 24 hours: ${site}/admin/reports\n`,
    html: `<p>A member reported a <strong>${kind}</strong> for <strong>${reason.toLowerCase()}</strong>.</p><p>Review it within 24 hours: <a href="${site}/admin/reports">${site}/admin/reports</a></p>`,
  }).catch((error) => console.error("[reports] could not email the Secretariat", error));

  return NextResponse.json({ ok: true, id: report.id });
}
