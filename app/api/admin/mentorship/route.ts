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
    const pageSize = Math.min(50, Math.max(6, Number.parseInt(params.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;
    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "all").trim();

    const where = {
      ...(status !== "all" ? { status: status as any } : {}),
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("[AdminMentorshipAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load mentorship records." }, { status: 500 });
  }
}
