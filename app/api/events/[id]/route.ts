import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
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
      select: { id: true, creatorId: true, isCancelled: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (event.creatorId !== me.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { action?: "cancel" | "reopen" };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        isCancelled: body.action === "cancel",
      },
      select: { id: true, isCancelled: true },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error("[EventsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update event." }, { status: 500 });
  }
}
