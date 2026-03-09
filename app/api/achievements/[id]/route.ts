import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

const MIN_YEAR = 1980;
const MAX_YEAR = 2100;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
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

    const { id } = await ctx.params;
    const existing = await prisma.achievement.findUnique({
      where: { id },
      select: { id: true, graduateId: true, verified: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Achievement not found." }, { status: 404 });
    }

    if (existing.graduateId !== me.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.verified && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Verified achievements cannot be edited. Contact admin." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string | null;
      year?: number | null;
    };

    const data: {
      title?: string;
      description?: string | null;
      year?: number | null;
    } = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Title is required." }, { status: 400 });
      }
      data.title = title;
    }

    if (body.description !== undefined) {
      const description = body.description?.trim() ?? "";
      data.description = description || null;
    }

    if (body.year !== undefined) {
      if (body.year !== null && (!Number.isInteger(body.year) || body.year < MIN_YEAR || body.year > MAX_YEAR)) {
        return NextResponse.json({ error: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.` }, { status: 400 });
      }
      data.year = body.year;
    }

    const achievement = await prisma.achievement.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        verified: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ achievement });
  } catch (error) {
    console.error("[AchievementsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update achievement." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
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

    const { id } = await ctx.params;
    const existing = await prisma.achievement.findUnique({
      where: { id },
      select: { id: true, graduateId: true, verified: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Achievement not found." }, { status: 404 });
    }

    if (existing.graduateId !== me.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.verified && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Verified achievements cannot be deleted. Contact admin." },
        { status: 400 }
      );
    }

    await prisma.achievement.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AchievementsAPI][DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete achievement." }, { status: 500 });
  }
}

