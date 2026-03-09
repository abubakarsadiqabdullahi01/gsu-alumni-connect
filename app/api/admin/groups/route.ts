import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(params.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;
    const q = (params.get("q") ?? "").trim();
    const type = (params.get("type") ?? "all").trim();
    const source = (params.get("source") ?? "all").trim();

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(type !== "all" ? { type: type as any } : {}),
      ...(source === "auto" ? { isAuto: true } : {}),
      ...(source === "custom" ? { isAuto: false } : {}),
    };

    const [groups, total, totalGroups, autoGroups, customGroups, totalMembers, totalPosts] = await Promise.all([
      prisma.alumniGroup.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          type: true,
          isAuto: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              posts: true,
            },
          },
        },
      }),
      prisma.alumniGroup.count({ where }),
      prisma.alumniGroup.count(),
      prisma.alumniGroup.count({ where: { isAuto: true } }),
      prisma.alumniGroup.count({ where: { isAuto: false } }),
      prisma.groupMember.count(),
      prisma.groupPost.count({ where: { isDeleted: false } }),
    ]);

    return NextResponse.json({
      groups: groups.map((group) => ({
        ...group,
        memberCount: group._count.members,
        postCount: group._count.posts,
      })),
      stats: {
        totalGroups,
        autoGroups,
        customGroups,
        totalMembers,
        totalPosts,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[AdminGroupsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}

