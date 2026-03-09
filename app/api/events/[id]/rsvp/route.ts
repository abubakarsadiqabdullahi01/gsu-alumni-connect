import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/src/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: eventId } = await ctx.params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        startsAt: true,
        isCancelled: true,
        creatorId: true,
        capacity: true,
        _count: { select: { attendees: true } },
      },
    });
    if (!event || event.isCancelled) {
      return NextResponse.json({ error: "Event not available." }, { status: 404 });
    }
    if (event.startsAt < new Date()) {
      return NextResponse.json({ error: "RSVP is closed for past events." }, { status: 400 });
    }
    if (event.capacity && event._count.attendees >= event.capacity) {
      return NextResponse.json({ error: "Event capacity reached." }, { status: 400 });
    }

    const rsvp = await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        graduateId: me.id,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (event.creatorId !== me.id) {
      await prisma.notification.create({
        data: {
          graduateId: event.creatorId,
          type: "ADMIN_BROADCAST",
          title: "New RSVP",
          body: "A graduate RSVP'd to your event.",
          actionUrl: "/events",
          metadata: { eventId: event.id },
        },
      });
    }

    return NextResponse.json({ rsvp }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You have already RSVP'd to this event." }, { status: 409 });
    }
    console.error("[EventsRSVP][POST] Error:", error);
    return NextResponse.json({ error: "Failed to RSVP." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: eventId } = await ctx.params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    await prisma.eventAttendee.deleteMany({
      where: {
        eventId,
        graduateId: me.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EventsRSVP][DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to cancel RSVP." }, { status: 500 });
  }
}
