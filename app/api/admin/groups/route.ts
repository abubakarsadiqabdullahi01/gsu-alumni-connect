import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GroupType, type Prisma } from "@/src/generated/prisma";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { getAdminCacheVersion } from "@/lib/cache/admin-cache-version";

const ADMIN_GROUPS_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.ADMIN_GROUPS_CACHE_TTL_SECONDS ?? "20", 10) || 20
);

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

    const cacheVersion = await getAdminCacheVersion("groups");
    const cacheKey = `admin:groups:v${cacheVersion}:${session.user.id}:p${page}:ps${pageSize}:q:${encodeURIComponent(q)}:t:${encodeURIComponent(type)}:s:${encodeURIComponent(source)}`;
    const cached = await redisGetJson<{
      groups: Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        type: string;
        isAuto: boolean;
        createdAt: Date;
        memberCount: number;
        postCount: number;
      }>;
      stats: {
        totalGroups: number;
        autoGroups: number;
        customGroups: number;
        totalMembers: number;
        totalPosts: number;
      };
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: Prisma.AlumniGroupWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(type !== "all" && Object.values(GroupType).includes(type as GroupType)
        ? { type: type as GroupType }
        : {}),
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

    const payload = {
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
    };

    void redisSetJson(cacheKey, payload, ADMIN_GROUPS_CACHE_TTL_SECONDS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[AdminGroupsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}
