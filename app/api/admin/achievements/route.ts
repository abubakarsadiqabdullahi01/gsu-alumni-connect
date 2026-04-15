import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { getAdminCacheVersion } from "@/lib/cache/admin-cache-version";

const ADMIN_ACHIEVEMENTS_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.ADMIN_ACHIEVEMENTS_CACHE_TTL_SECONDS ?? "20", 10) || 20
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
    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "pending").trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(30, Math.max(6, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const cacheVersion = await getAdminCacheVersion("achievements");
    const cacheKey = `admin:achievements:v${cacheVersion}:${session.user.id}:p${page}:ps${pageSize}:q:${encodeURIComponent(q)}:st:${encodeURIComponent(status)}`;
    const cached = await redisGetJson<{
      achievements: Array<{
        id: string;
        title: string;
        description: string;
        year: number | null;
        verified: boolean;
        verifiedAt: Date | null;
        createdAt: Date;
        graduateId: string;
        graduate: {
          id: string;
          fullName: string;
          registrationNo: string;
          facultyName: string | null;
          departmentName: string | null;
          graduationYear: string | null;
          user: {
            email: string;
            phone: string | null;
          };
        };
      }>;
      stats: {
        pending: number;
        verified: number;
        total: number;
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

    const where = {
      ...(status === "pending" ? { verified: false } : {}),
      ...(status === "verified" ? { verified: true } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { graduate: { fullName: { contains: q, mode: "insensitive" as const } } },
              { graduate: { registrationNo: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [rows, total, statsPending, statsVerified, statsAll] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          year: true,
          verified: true,
          verifiedAt: true,
          createdAt: true,
          graduateId: true,
          graduate: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              graduationYear: true,
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      prisma.achievement.count({ where }),
      prisma.achievement.count({ where: { verified: false } }),
      prisma.achievement.count({ where: { verified: true } }),
      prisma.achievement.count(),
    ]);

    const payload = {
      achievements: rows,
      stats: {
        pending: statsPending,
        verified: statsVerified,
        total: statsAll,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    void redisSetJson(cacheKey, payload, ADMIN_ACHIEVEMENTS_CACHE_TTL_SECONDS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[AdminAchievementsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load achievements moderation queue." }, { status: 500 });
  }
}
