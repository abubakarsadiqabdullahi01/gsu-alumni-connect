import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MentorshipStatus, type Prisma } from "@/src/generated/prisma";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { getAdminCacheVersion } from "@/lib/cache/admin-cache-version";

const ADMIN_MENTORSHIP_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.ADMIN_MENTORSHIP_CACHE_TTL_SECONDS ?? "20", 10) || 20
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
    const pageSize = Math.min(50, Math.max(6, Number.parseInt(params.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;
    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "all").trim();

    const cacheVersion = await getAdminCacheVersion("mentorship");
    const cacheKey = `admin:mentorship:v${cacheVersion}:${session.user.id}:p${page}:ps${pageSize}:q:${encodeURIComponent(q)}:st:${encodeURIComponent(status)}`;
    const cached = await redisGetJson<{
      mentorships: Array<{
        id: string;
        subject: string;
        message: string;
        notes: string | null;
        status: string;
        createdAt: Date;
        acceptedAt: Date | null;
        completedAt: Date | null;
        mentor: {
          id: string;
          fullName: string;
          registrationNo: string;
          facultyName: string | null;
          departmentName: string | null;
          user: { email: string; phone: string | null };
        };
        mentee: {
          id: string;
          fullName: string;
          registrationNo: string;
          facultyName: string | null;
          departmentName: string | null;
          user: { email: string; phone: string | null };
        };
      }>;
      stats: {
        totalPairs: number;
        pending: number;
        active: number;
        completed: number;
        cancelled: number;
        declined: number;
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

    const where: Prisma.MentorshipWhereInput = {
      ...(status !== "all" && Object.values(MentorshipStatus).includes(status as MentorshipStatus)
        ? { status: status as MentorshipStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" as const } },
              { message: { contains: q, mode: "insensitive" as const } },
              { mentor: { fullName: { contains: q, mode: "insensitive" as const } } },
              { mentor: { registrationNo: { contains: q, mode: "insensitive" as const } } },
              { mentee: { fullName: { contains: q, mode: "insensitive" as const } } },
              { mentee: { registrationNo: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [rows, total, totalPairs, pending, accepted, completed, cancelled, declined] = await Promise.all([
      prisma.mentorship.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          message: true,
          notes: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
          completedAt: true,
          mentor: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { email: true, phone: true } },
            },
          },
          mentee: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: { select: { email: true, phone: true } },
            },
          },
        },
      }),
      prisma.mentorship.count({ where }),
      prisma.mentorship.count(),
      prisma.mentorship.count({ where: { status: "PENDING" } }),
      prisma.mentorship.count({ where: { status: "ACCEPTED" } }),
      prisma.mentorship.count({ where: { status: "COMPLETED" } }),
      prisma.mentorship.count({ where: { status: "CANCELLED" } }),
      prisma.mentorship.count({ where: { status: "DECLINED" } }),
    ]);

    const payload = {
      mentorships: rows,
      stats: {
        totalPairs,
        pending,
        active: accepted,
        completed,
        cancelled,
        declined,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    void redisSetJson(cacheKey, payload, ADMIN_MENTORSHIP_CACHE_TTL_SECONDS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[AdminMentorshipAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load mentorship records." }, { status: 500 });
  }
}
