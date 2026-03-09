import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    if (!(await isFeatureEnabled("featureMentorship"))) {
      return NextResponse.json({ error: "Mentorship feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
      select: {
        id: true,
        mentorId: true,
        menteeId: true,
        status: true,
        subject: true,
      },
    });
    if (!mentorship) {
      return NextResponse.json({ error: "Mentorship request not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      action?: "accept" | "decline" | "cancel" | "complete";
      notes?: string;
    };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const isMentor = mentorship.mentorId === me.id;
    const isMentee = mentorship.menteeId === me.id;
    if (!isMentor && !isMentee && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (body.action === "accept") {
      if (!isMentor && session.user.role !== "admin") {
        return NextResponse.json({ error: "Only mentor can accept request." }, { status: 403 });
      }
      if (mentorship.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending requests can be accepted." }, { status: 400 });
      }
      data.status = "ACCEPTED";
      data.acceptedAt = new Date();
    } else if (body.action === "decline") {
      if (!isMentor && session.user.role !== "admin") {
        return NextResponse.json({ error: "Only mentor can decline request." }, { status: 403 });
      }
      if (mentorship.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending requests can be declined." }, { status: 400 });
      }
      data.status = "DECLINED";
    } else if (body.action === "cancel") {
      if (!isMentee && session.user.role !== "admin") {
        return NextResponse.json({ error: "Only mentee can cancel request." }, { status: 403 });
      }
      if (mentorship.status !== "PENDING" && mentorship.status !== "ACCEPTED") {
        return NextResponse.json({ error: "Request cannot be cancelled." }, { status: 400 });
      }
      data.status = "CANCELLED";
    } else if (body.action === "complete") {
      if (!isMentor && session.user.role !== "admin") {
        return NextResponse.json({ error: "Only mentor can complete mentorship." }, { status: 403 });
      }
      if (mentorship.status !== "ACCEPTED") {
        return NextResponse.json({ error: "Only accepted mentorship can be completed." }, { status: 400 });
      }
      data.status = "COMPLETED";
      data.completedAt = new Date();
      data.notes = body.notes?.trim() || null;
    }

    const updated = await prisma.mentorship.update({
      where: { id: mentorship.id },
      data,
      select: {
        id: true,
        status: true,
      },
    });

    const notifyTarget =
      body.action === "accept" || body.action === "decline" || body.action === "complete"
        ? mentorship.menteeId
        : mentorship.mentorId;

    const titleByAction: Record<string, string> = {
      accept: "Mentorship accepted",
      decline: "Mentorship request declined",
      cancel: "Mentorship cancelled",
      complete: "Mentorship completed",
    };
    const bodyByAction: Record<string, string> = {
      accept: `${me.fullName} accepted your mentorship request.`,
      decline: `${me.fullName} declined your mentorship request.`,
      cancel: `${me.fullName} cancelled the mentorship request.`,
      complete: `${me.fullName} marked the mentorship as completed.`,
    };

    await prisma.notification.create({
      data: {
        graduateId: notifyTarget,
        type: body.action === "accept" ? "MENTORSHIP_ACCEPTED" : "MENTORSHIP_REQUEST",
        title: titleByAction[body.action],
        body: bodyByAction[body.action],
        actionUrl: "/mentorship",
        metadata: { mentorshipId: mentorship.id },
      },
    });

    return NextResponse.json({ mentorship: updated });
  } catch (error) {
    console.error("[MentorshipAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update mentorship request." }, { status: 500 });
  }
}
