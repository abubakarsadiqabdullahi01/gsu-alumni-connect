import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const me = await prisma.graduate.findUnique({
      where: { userId: guard.session.user.id },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json({
        notifications: [],
        stats: { unread: 0, read: 0, total: 0 },
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
      });
    }

    const params = request.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "all").trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(30, Math.max(6, Number.parseInt(params.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;

    const where = {
      graduateId: me.id,
      ...(status === "unread" ? { isRead: false } : {}),
      ...(status === "read" ? { isRead: true } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [notifications, total, unreadCount, readCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          actionUrl: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { graduateId: me.id, isRead: false } }),
      prisma.notification.count({ where: { graduateId: me.id, isRead: true } }),
    ]);

    return NextResponse.json({
      notifications,
      stats: {
        unread: unreadCount,
        read: readCount,
        total: unreadCount + readCount,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[AdminNotificationsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const me = await prisma.graduate.findUnique({
      where: { userId: guard.session.user.id },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json({ updated: 0 });
    }

    const body = (await request.json()) as { action?: "mark_all_read" };
    if (body.action !== "mark_all_read") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const now = new Date();
    const updated = await prisma.notification.updateMany({
      where: { graduateId: me.id, isRead: false },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return NextResponse.json({ updated: updated.count });
  } catch (error) {
    console.error("[AdminNotificationsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
