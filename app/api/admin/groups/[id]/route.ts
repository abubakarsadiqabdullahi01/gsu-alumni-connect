import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const group = await prisma.alumniGroup.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        isAuto: true,
        cohortYear: true,
        facultyCode: true,
        courseCode: true,
        stateCode: true,
        createdAt: true,
        updatedAt: true,
        members: {
          orderBy: [{ joinedAt: "desc" }],
          take: 50,
          select: {
            id: true,
            role: true,
            joinedAt: true,
            graduate: {
              select: {
                id: true,
                fullName: true,
                registrationNo: true,
                facultyName: true,
                departmentName: true,
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
        posts: {
          orderBy: [{ createdAt: "desc" }],
          take: 50,
          select: {
            id: true,
            content: true,
            imageUrl: true,
            isDeleted: true,
            isPinned: true,
            createdAt: true,
            author: {
              select: {
                fullName: true,
                registrationNo: true,
              },
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    return NextResponse.json({
      group: {
        ...group,
        memberCount: group._count.members,
        postCount: group._count.posts,
      },
    });
  } catch (error) {
    console.error("[AdminGroupsAPI][GET_DETAIL] Error:", error);
    return NextResponse.json({ error: "Failed to load group detail." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const group = await prisma.alumniGroup.findUnique({
      where: { id },
      select: { id: true, name: true, isAuto: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }
    if (group.isAuto) {
      return NextResponse.json(
        { error: "Auto-generated groups cannot be deleted from admin." },
        { status: 400 }
      );
    }

    await prisma.alumniGroup.delete({ where: { id: group.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminGroupsAPI][DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete group." }, { status: 500 });
  }
}

