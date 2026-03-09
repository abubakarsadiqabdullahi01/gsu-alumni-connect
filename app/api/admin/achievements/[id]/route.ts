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
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await req.json()) as { action?: "verify" | "unverify" | "reject" };
    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const existing = await prisma.achievement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        verified: true,
        graduateId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Achievement not found." }, { status: 404 });
    }

    if (body.action === "verify") {
      const achievement = await prisma.achievement.update({
        where: { id: existing.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
        select: {
          id: true,
          verified: true,
          verifiedAt: true,
        },
      });

      await prisma.notification.create({
        data: {
          graduateId: existing.graduateId,
          type: "ADMIN_BROADCAST",
          title: "Achievement verified",
          body: `Your achievement \"${existing.title}\" has been verified by admin.`,
          actionUrl: "/achievements",
          metadata: { achievementId: existing.id, action: "verify" },
        },
      });

      return NextResponse.json({ achievement });
    }

    if (body.action === "unverify") {
      const achievement = await prisma.achievement.update({
        where: { id: existing.id },
        data: {
          verified: false,
          verifiedAt: null,
        },
        select: {
          id: true,
          verified: true,
          verifiedAt: true,
        },
      });

      await prisma.notification.create({
        data: {
          graduateId: existing.graduateId,
          type: "ADMIN_BROADCAST",
          title: "Achievement moved to pending review",
          body: `Your achievement \"${existing.title}\" was moved back to pending review.`,
          actionUrl: "/achievements",
          metadata: { achievementId: existing.id, action: "unverify" },
        },
      });

      return NextResponse.json({ achievement });
    }

    await prisma.achievement.delete({ where: { id: existing.id } });

    await prisma.notification.create({
      data: {
        graduateId: existing.graduateId,
        type: "ADMIN_BROADCAST",
        title: "Achievement not approved",
        body: `Your achievement \"${existing.title}\" was not approved and has been removed.`,
        actionUrl: "/achievements",
        metadata: { achievementId: existing.id, action: "reject" },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminAchievementsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to process achievement action." }, { status: 500 });
  }
}
