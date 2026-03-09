import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const me = await prisma.graduate.findUnique({
      where: { userId: guard.session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const { id } = await ctx.params;
    const body = (await request.json()) as { action?: "read" };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }
    if (body.action !== "read") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, graduateId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    if (existing.graduateId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("[AdminNotificationsAPI][PATCH:id] Error:", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
