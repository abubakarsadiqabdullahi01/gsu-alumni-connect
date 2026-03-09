import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MONTHS_TO_SHOW = 12;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalConnections, acceptedConnections, pendingConnections, blockedConnections, totalGraduates, acceptedRows] = await Promise.all([
      prisma.connection.count(),
      prisma.connection.count({ where: { status: "ACCEPTED" } }),
      prisma.connection.count({ where: { status: "PENDING" } }),
      prisma.connection.count({ where: { status: "BLOCKED" } }),
      prisma.graduate.count(),
      prisma.connection.findMany({
        where: { status: "ACCEPTED" },
        select: {
          createdAt: true,
          requesterId: true,
          receiverId: true,
          requester: {
            select: {
              facultyName: true,
            },
          },
          receiver: {
            select: {
              facultyName: true,
            },
          },
        },
      }),
    ]);

    const avgConnectionsPerUser = totalGraduates > 0 ? (acceptedConnections * 2) / totalGraduates : 0;

    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = MONTHS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(monthKey(d));
    }

    const growthMap = new Map(monthKeys.map((k) => [k, 0]));
    for (const row of acceptedRows) {
      const key = monthKey(new Date(row.createdAt));
      if (growthMap.has(key)) {
        growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
      }
    }

    const connectionsGrowth = monthKeys.map((key) => ({
      month: monthLabel(key),
      connections: growthMap.get(key) ?? 0,
    }));

    const facultyMap = new Map<string, number>();
    for (const row of acceptedRows) {
      const requesterFaculty = row.requester.facultyName?.trim() || "Unknown";
      const receiverFaculty = row.receiver.facultyName?.trim() || "Unknown";
      facultyMap.set(requesterFaculty, (facultyMap.get(requesterFaculty) ?? 0) + 1);
      facultyMap.set(receiverFaculty, (facultyMap.get(receiverFaculty) ?? 0) + 1);
    }

    const connectionsByFaculty = [...facultyMap.entries()]
      .map(([faculty, connections]) => ({ faculty, connections }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);

    const connectorCount = new Map<string, number>();
    for (const row of acceptedRows) {
      connectorCount.set(row.requesterId, (connectorCount.get(row.requesterId) ?? 0) + 1);
      connectorCount.set(row.receiverId, (connectorCount.get(row.receiverId) ?? 0) + 1);
    }

    const topIds = [...connectorCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topGraduates = await prisma.graduate.findMany({
      where: { id: { in: topIds } },
      select: {
        id: true,
        fullName: true,
        departmentName: true,
      },
    });

    const topById = new Map(topGraduates.map((g) => [g.id, g]));
    const topConnectors = topIds
      .map((id) => {
        const grad = topById.get(id);
        if (!grad) return null;
        return {
          id: grad.id,
          name: grad.fullName,
          department: grad.departmentName || "Department not set",
          connections: connectorCount.get(id) ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json({
      stats: {
        totalConnections,
        acceptedConnections,
        pendingConnections,
        blockedConnections,
        avgConnectionsPerUser,
      },
      connectionsGrowth,
      connectionsByFaculty,
      topConnectors,
    });
  } catch (error) {
    console.error("[AdminNetworkAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load network analytics." }, { status: 500 });
  }
}
