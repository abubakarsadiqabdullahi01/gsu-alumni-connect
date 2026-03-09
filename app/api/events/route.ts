import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
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

    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim();
    const type = (params.get("type") ?? "").trim();
    const status = (params.get("status") ?? "upcoming").trim(); // upcoming | past | all
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(20, Math.max(6, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const browseWhere = {
      isPublic: true,
      isCancelled: false,
      ...(type && type !== "all" ? { type: type as any } : {}),
      ...(status === "upcoming" ? { startsAt: { gte: now } } : {}),
      ...(status === "past" ? { startsAt: { lt: now } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { location: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [events, total, myEvents, myRsvpRows] = await Promise.all([
      prisma.event.findMany({
        where: browseWhere,
        skip,
        take: pageSize,
        orderBy: [{ startsAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          location: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          isPublic: true,
          isCancelled: true,
          createdAt: true,
          creatorId: true,
          creator: {
            select: {
              fullName: true,
              registrationNo: true,
              departmentName: true,
            },
          },
          _count: { select: { attendees: true } },
        },
      }),
      prisma.event.count({ where: browseWhere }),
      prisma.event.findMany({
        where: { creatorId: me.id },
        orderBy: [{ startsAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          location: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          isPublic: true,
          isCancelled: true,
          createdAt: true,
          _count: { select: { attendees: true } },
          attendees: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              createdAt: true,
              graduate: {
                select: {
                  fullName: true,
                  registrationNo: true,
                  departmentName: true,
                  facultyName: true,
                  user: {
                    select: {
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.eventAttendee.findMany({
        where: { graduateId: me.id },
        orderBy: [{ createdAt: "desc" }],
        select: {
          eventId: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              title: true,
              type: true,
              startsAt: true,
              location: true,
              isCancelled: true,
              creator: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const joinedEventIds = new Set(myRsvpRows.map((x) => x.eventId));

    return NextResponse.json({
      events: events.map((event) => ({
        ...event,
        attendeesCount: event._count.attendees,
        joined: joinedEventIds.has(event.id),
        isMine: event.creatorId === me.id,
      })),
      myEvents: myEvents.map((event) => ({
        ...event,
        attendeesCount: event._count.attendees,
      })),
      myRsvps: myRsvpRows,
      stats: {
        total: total,
        upcoming: events.filter((e) => e.startsAt >= now).length,
        mine: myEvents.length,
        joined: myRsvpRows.length,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[EventsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load events." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      title?: string;
      description?: string;
      type?: "REUNION" | "MEETUP" | "WORKSHOP" | "NETWORKING" | "WEBINAR";
      location?: string;
      startsAt?: string;
      endsAt?: string | null;
      capacity?: number | null;
      isPublic?: boolean;
    };

    const title = (body.title ?? "").trim();
    const location = (body.location ?? "").trim();
    if (!title || !location || !body.startsAt) {
      return NextResponse.json({ error: "Title, location, and start date are required." }, { status: 400 });
    }

    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
    }
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (endsAt && endsAt < startsAt) {
      return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        creatorId: me.id,
        title,
        description: body.description?.trim() || null,
        type: body.type ?? "MEETUP",
        location,
        startsAt,
        endsAt,
        capacity: body.capacity ?? null,
        isPublic: body.isPublic ?? true,
        isCancelled: false,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[EventsAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }
}
