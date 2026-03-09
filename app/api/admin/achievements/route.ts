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
    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "pending").trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(30, Math.max(6, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("[AdminAchievementsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load achievements moderation queue." }, { status: 500 });
  }
}
