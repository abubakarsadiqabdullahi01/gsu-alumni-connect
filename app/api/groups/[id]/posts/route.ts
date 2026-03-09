import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPusherServer } from "@/lib/pusher-server";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_graduateId: {
          groupId: id,
          graduateId: me.id,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Join group to view posts." }, { status: 403 });
    }

    const group = await prisma.alumniGroup.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, description: true },
    });
    if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

    const posts = await prisma.groupPost.findMany({
      where: { groupId: id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            registrationNo: true,
            user: { select: { image: true } },
          },
        },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    return NextResponse.json({
      group,
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        isPinned: p.isPinned,
        createdAt: p.createdAt.toISOString(),
        author: {
          graduateId: p.author.id,
          fullName: p.author.fullName,
          registrationNo: p.author.registrationNo,
          image: p.author.user.image,
        },
        commentsCount: p._count.comments,
        reactionsCount: p._count.reactions,
      })),
    });
  } catch (error) {
    console.error("[GroupPostsGet] Error:", error);
    return NextResponse.json({ error: "Failed to load group posts." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_graduateId: {
          groupId: id,
          graduateId: me.id,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Join group before posting." }, { status: 403 });
    }

    const body = (await req.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (content.length < 1) {
      return NextResponse.json({ error: "Post content cannot be empty." }, { status: 400 });
    }
    if (content.length > 3000) {
      return NextResponse.json({ error: "Post is too long." }, { status: 400 });
    }

    const post = await prisma.groupPost.create({
      data: {
        groupId: id,
        authorId: me.id,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            registrationNo: true,
            user: { select: { image: true } },
          },
        },
      },
    });

    await prisma.activityFeedItem.create({
      data: {
        graduateId: me.id,
        actionType: "POSTED_IN_GROUP",
        headline: `${me.fullName} posted in a group`,
        isPublic: true,
      },
    });

    const payload = {
      id: post.id,
      content: post.content,
      isPinned: post.isPinned,
      createdAt: post.createdAt.toISOString(),
      author: {
        graduateId: post.author.id,
        fullName: post.author.fullName,
        registrationNo: post.author.registrationNo,
        image: post.author.user.image,
      },
      commentsCount: 0,
      reactionsCount: 0,
    };

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(`private-group-${id}`, "post:new", payload);
    }

    return NextResponse.json({ success: true, post: payload });
  } catch (error) {
    console.error("[GroupPostsCreate] Error:", error);
    return NextResponse.json({ error: "Failed to create post." }, { status: 500 });
  }
}
