import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isSessionOk } from "@/lib/api-middleware";
import { bumpNotificationsCacheVersion } from "@/lib/cache/notifications-cache";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const result = await requireAdmin(request.headers, "AdminNotificationIDAPI");
    if (!isSessionOk(result)) return result.error;

    const me = await prisma.graduate.findUnique({
      where: { userId: result.session.user.id },
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

    void bumpNotificationsCacheVersion(me.id, "admin");
    return NextResponse.json({ notification });
  } catch (error) {
    console.error("[AdminNotificationsAPI][PATCH:id] Error:", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
