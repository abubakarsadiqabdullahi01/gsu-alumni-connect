import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        message: true,
        notes: true,
        status: true,
        createdAt: true,
        acceptedAt: true,
        completedAt: true,
        updatedAt: true,
        mentor: {
          select: {
            id: true,
            fullName: true,
            registrationNo: true,
            facultyName: true,
            departmentName: true,
            user: { select: { email: true, phone: true } },
          },
        },
        mentee: {
          select: {
            id: true,
            fullName: true,
            registrationNo: true,
            facultyName: true,
            departmentName: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    if (!mentorship) {
      return NextResponse.json({ error: "Mentorship not found." }, { status: 404 });
    }

    const timeline = [
      {
        key: "created",
        label: "Request created",
        at: mentorship.createdAt,
      },
      ...(mentorship.acceptedAt
        ? [{ key: "accepted", label: "Request accepted", at: mentorship.acceptedAt }]
        : []),
      ...(mentorship.completedAt
        ? [{ key: "completed", label: "Mentorship completed", at: mentorship.completedAt }]
        : []),
      ...(mentorship.status === "DECLINED"
        ? [{ key: "declined", label: "Request declined", at: mentorship.updatedAt }]
        : []),
      ...(mentorship.status === "CANCELLED"
        ? [{ key: "cancelled", label: "Mentorship cancelled", at: mentorship.updatedAt }]
        : []),
    ];

    return NextResponse.json({
      mentorship,
      timeline,
    });
  } catch (error) {
    console.error("[AdminMentorshipAPI][GET_DETAIL] Error:", error);
    return NextResponse.json({ error: "Failed to load mentorship detail." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await req.json()) as {
      action?: "accept" | "decline" | "cancel" | "complete";
      notes?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
      select: {
        id: true,
        mentorId: true,
        menteeId: true,
        status: true,
      },
    });

    if (!mentorship) {
      return NextResponse.json({ error: "Mentorship not found." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.action === "accept") {
      if (mentorship.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending mentorship can be accepted." }, { status: 400 });
      }
      data.status = "ACCEPTED";
      data.acceptedAt = new Date();
    }

    if (body.action === "decline") {
      if (mentorship.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending mentorship can be declined." }, { status: 400 });
      }
      data.status = "DECLINED";
    }

    if (body.action === "cancel") {
      if (mentorship.status !== "PENDING" && mentorship.status !== "ACCEPTED") {
        return NextResponse.json({ error: "Mentorship cannot be cancelled." }, { status: 400 });
      }
      data.status = "CANCELLED";
    }

    if (body.action === "complete") {
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
        acceptedAt: true,
        completedAt: true,
        notes: true,
      },
    });

    const titleByAction: Record<string, string> = {
      accept: "Mentorship accepted",
      decline: "Mentorship declined",
      cancel: "Mentorship cancelled",
      complete: "Mentorship completed",
    };

    await prisma.notification.createMany({
      data: [
        {
          graduateId: mentorship.mentorId,
          type: body.action === "accept" ? "MENTORSHIP_ACCEPTED" : "MENTORSHIP_REQUEST",
          title: titleByAction[body.action],
          body: `Admin updated mentorship status to ${updated.status}.`,
          actionUrl: "/mentorship",
          metadata: { mentorshipId: mentorship.id, action: body.action },
        },
        {
          graduateId: mentorship.menteeId,
          type: body.action === "accept" ? "MENTORSHIP_ACCEPTED" : "MENTORSHIP_REQUEST",
          title: titleByAction[body.action],
          body: `Admin updated mentorship status to ${updated.status}.`,
          actionUrl: "/mentorship",
          metadata: { mentorshipId: mentorship.id, action: body.action },
        },
      ],
    });

    return NextResponse.json({ mentorship: updated });
  } catch (error) {
    console.error("[AdminMentorshipAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update mentorship." }, { status: 500 });
  }
}
