import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get("q") ?? "").trim();
    const department = (searchParams.get("department") ?? "").trim();
    const year = (searchParams.get("year") ?? "").trim();
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(24, Math.max(6, Number.parseInt(searchParams.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;

    const currentGraduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const where = {
      showInDirectory: true,
      user: {
        accountStatus: "ACTIVE" as const,
      },
      ...(currentGraduate ? { userId: { not: session.user.id } } : {}),
      ...(department ? { departmentName: department } : {}),
      ...(year ? { graduationYear: year } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { departmentName: { contains: q, mode: "insensitive" as const } },
              { facultyName: { contains: q, mode: "insensitive" as const } },
              { registrationNo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rawItems, total] = await Promise.all([
      prisma.graduate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          registrationNo: true,
          departmentName: true,
          facultyName: true,
          graduationYear: true,
          degreeClass: true,
          stateOfOrigin: true,
          bio: true,
          openToOpportunities: true,
          availableForMentorship: true,
          user: {
            select: {
              image: true,
            },
          },
        },
      }),
      prisma.graduate.count({ where }),
    ]);

    const ids = rawItems.map((i) => i.id);
    const connections =
      currentGraduate && ids.length
        ? await prisma.connection.findMany({
            where: {
              OR: [
                { requesterId: currentGraduate.id, receiverId: { in: ids } },
                { requesterId: { in: ids }, receiverId: currentGraduate.id },
              ],
            },
            select: {
              requesterId: true,
              receiverId: true,
              status: true,
            },
          })
        : [];

    const statusByGraduateId = new Map<string, string>();
    if (currentGraduate) {
      for (const conn of connections) {
        const otherId =
          conn.requesterId === currentGraduate.id ? conn.receiverId : conn.requesterId;
        statusByGraduateId.set(otherId, conn.status);
      }
    }

    const items = rawItems.map((item) => ({
      ...item,
      connectionStatus: statusByGraduateId.get(item.id) ?? null,
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[DirectoryAPI] Error:", error);
    return NextResponse.json({ error: "Failed to load directory." }, { status: 500 });
  }
}
