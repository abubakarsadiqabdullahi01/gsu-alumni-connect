import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMentorship"))) {
      return NextResponse.json({ error: "Mentorship feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

    const [mentors, incoming, outgoing, activeAsMentee, activeAsMentor] = await Promise.all([
      prisma.graduate.findMany({
        where: {
          id: { not: me.id },
          availableForMentorship: true,
          user: { accountStatus: "ACTIVE" },
          ...(q
            ? {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" as const } },
                  { departmentName: { contains: q, mode: "insensitive" as const } },
                  { facultyName: { contains: q, mode: "insensitive" as const } },
                  { registrationNo: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        take: 60,
        orderBy: [{ fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          registrationNo: true,
          departmentName: true,
          facultyName: true,
          graduationYear: true,
          bio: true,
          openToOpportunities: true,
          availableForMentorship: true,
          user: { select: { image: true } },
          skills: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              skillName: true,
              proficiency: true,
            },
            take: 6,
          },
        },
      }),
      prisma.mentorship.findMany({
        where: { mentorId: me.id, status: "PENDING" },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
          mentee: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { image: true, email: true, phone: true } },
            },
          },
        },
      }),
      prisma.mentorship.findMany({
        where: { menteeId: me.id, status: "PENDING" },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
          mentor: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { image: true, email: true, phone: true } },
            },
          },
        },
      }),
      prisma.mentorship.findMany({
        where: { menteeId: me.id, status: "ACCEPTED" },
        orderBy: [{ acceptedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          message: true,
          notes: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
          mentor: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { image: true, email: true, phone: true } },
            },
          },
        },
      }),
      prisma.mentorship.findMany({
        where: { mentorId: me.id, status: "ACCEPTED" },
        orderBy: [{ acceptedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          message: true,
          notes: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
          mentee: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { image: true, email: true, phone: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      mentors,
      incoming,
      outgoing,
      activeAsMentee,
      activeAsMentor,
      stats: {
        mentors: mentors.length,
        incoming: incoming.length,
        outgoing: outgoing.length,
        active: activeAsMentee.length + activeAsMentor.length,
      },
    });
  } catch (error) {
    console.error("[MentorshipAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load mentorship data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMentorship"))) {
      return NextResponse.json({ error: "Mentorship feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      mentorId?: string;
      subject?: string;
      message?: string;
    };
    const mentorId = body.mentorId?.trim();
    const subject = body.subject?.trim() || null;
    const message = body.message?.trim() || null;

    if (!mentorId) {
      return NextResponse.json({ error: "Mentor is required." }, { status: 400 });
    }
    if (mentorId === me.id) {
      return NextResponse.json({ error: "You cannot request mentorship from yourself." }, { status: 400 });
    }

    const mentor = await prisma.graduate.findUnique({
      where: { id: mentorId },
      select: { id: true, availableForMentorship: true, fullName: true, user: { select: { accountStatus: true } } },
    });
    if (!mentor || mentor.user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Mentor not available." }, { status: 404 });
    }
    if (!mentor.availableForMentorship) {
      return NextResponse.json({ error: "This mentor is not accepting requests currently." }, { status: 400 });
    }

    const existing = await prisma.mentorship.findFirst({
      where: {
        mentorId,
        menteeId: me.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json({ error: `Request already ${existing.status.toLowerCase()}.` }, { status: 409 });
    }

    const created = await prisma.mentorship.create({
      data: {
        mentorId,
        menteeId: me.id,
        subject,
        message,
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        graduateId: mentorId,
        type: "MENTORSHIP_REQUEST",
        title: "New mentorship request",
        body: `${me.fullName} requested mentorship${subject ? ` (${subject})` : ""}.`,
        actionUrl: "/mentorship",
        metadata: { menteeId: me.id, mentorshipId: created.id },
      },
    });

    return NextResponse.json({ mentorship: created }, { status: 201 });
  } catch (error) {
    console.error("[MentorshipAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to create mentorship request." }, { status: 500 });
  }
}
