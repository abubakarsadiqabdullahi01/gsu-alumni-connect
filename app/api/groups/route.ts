import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

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

    const groups = await prisma.alumniGroup.findMany({
      orderBy: [{ isAuto: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { members: true, posts: true } },
        posts: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, createdAt: true },
        },
      },
      take: 200,
    });

    const memberships = await prisma.groupMember.findMany({
      where: {
        graduateId: me.id,
        groupId: { in: groups.map((g) => g.id) },
      },
      select: {
        groupId: true,
        role: true,
        joinedAt: true,
      },
    });

    const membershipByGroup = new Map(
      memberships.map((m) => [m.groupId, { role: m.role, joinedAt: m.joinedAt.toISOString() }])
    );

    const items = groups.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      type: g.type,
      isAuto: g.isAuto,
      cohortYear: g.cohortYear,
      facultyCode: g.facultyCode,
      courseCode: g.courseCode,
      stateCode: g.stateCode,
      memberCount: g._count.members,
      postCount: g._count.posts,
      lastPost: g.posts[0]
        ? {
            id: g.posts[0].id,
            content: g.posts[0].content,
            createdAt: g.posts[0].createdAt.toISOString(),
          }
        : null,
      membership: membershipByGroup.get(g.id) ?? null,
      createdAt: g.createdAt.toISOString(),
    }));

    return NextResponse.json({
      groups: items,
      stats: {
        total: items.length,
        joined: items.filter((x) => x.membership).length,
      },
    });
  } catch (error) {
    console.error("[GroupsGet] Error:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}
