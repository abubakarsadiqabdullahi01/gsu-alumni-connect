import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ postId: string }>;
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

    const { postId } = await ctx.params;
    const body = (await req.json()) as { action?: "delete" | "restore" | "pin" | "unpin" };

    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true, isPinned: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const data = {
      ...(body.action === "delete" ? { isDeleted: true } : {}),
      ...(body.action === "restore" ? { isDeleted: false } : {}),
      ...(body.action === "pin" ? { isPinned: true } : {}),
      ...(body.action === "unpin" ? { isPinned: false } : {}),
    };

    const updated = await prisma.groupPost.update({
      where: { id: post.id },
      data,
      select: { id: true, isDeleted: true, isPinned: true },
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("[AdminGroupsAPI][PATCH_POST] Error:", error);
    return NextResponse.json({ error: "Failed to update post." }, { status: 500 });
  }
}

