import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function mapPerson(input: {
  id: string;
  fullName: string;
  registrationNo: string;
  departmentName: string | null;
  facultyName: string | null;
  graduationYear: string | null;
  bio: string | null;
  user: { image: string | null };
}) {
  return {
    graduateId: input.id,
    fullName: input.fullName,
    registrationNo: input.registrationNo,
    departmentName: input.departmentName,
    facultyName: input.facultyName,
    graduationYear: input.graduationYear,
    bio: input.bio,
    image: input.user.image,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, departmentName: true, graduationYear: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const [acceptedRows, incomingRows, outgoingRows, existingRows] = await Promise.all([
      prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: me.id }, { receiverId: me.id }],
        },
        orderBy: { updatedAt: "desc" },
        include: {
          requester: {
            include: {
              user: { select: { image: true } },
            },
          },
          receiver: {
            include: {
              user: { select: { image: true } },
            },
          },
        },
      }),
      prisma.connection.findMany({
        where: {
          status: "PENDING",
          receiverId: me.id,
        },
        orderBy: { createdAt: "desc" },
        include: {
          requester: {
            include: {
              user: { select: { image: true } },
            },
          },
        },
      }),
      prisma.connection.findMany({
        where: {
          status: "PENDING",
          requesterId: me.id,
        },
        orderBy: { createdAt: "desc" },
        include: {
          receiver: {
            include: {
              user: { select: { image: true } },
            },
          },
        },
      }),
      prisma.connection.findMany({
        where: {
          OR: [{ requesterId: me.id }, { receiverId: me.id }],
        },
        select: {
          requesterId: true,
          receiverId: true,
        },
      }),
    ]);

    const accepted = acceptedRows.map((row) => {
      const person = row.requesterId === me.id ? row.receiver : row.requester;
      return {
        connectionId: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        person: mapPerson(person),
      };
    });

    const incoming = incomingRows.map((row) => ({
      connectionId: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      person: mapPerson(row.requester),
    }));

    const outgoing = outgoingRows.map((row) => ({
      connectionId: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      person: mapPerson(row.receiver),
    }));

    const excludedIds = new Set<string>([me.id]);
    for (const row of existingRows) {
      excludedIds.add(row.requesterId);
      excludedIds.add(row.receiverId);
    }

    const suggestionsRaw = await prisma.graduate.findMany({
      where: {
        id: { notIn: [...excludedIds] },
        showInDirectory: true,
        user: { accountStatus: "ACTIVE" },
      },
      orderBy: [{ profileViews: "desc" }, { fullName: "asc" }],
      take: 30,
      include: {
        user: { select: { image: true } },
      },
    });

    const suggestions = suggestionsRaw.map((g) => ({
      person: mapPerson(g),
      relevance:
        (g.departmentName && me.departmentName && g.departmentName === me.departmentName ? 2 : 0) +
        (g.graduationYear && me.graduationYear && g.graduationYear === me.graduationYear ? 1 : 0),
      openToOpportunities: g.openToOpportunities,
      availableForMentorship: g.availableForMentorship,
    }));

    suggestions.sort((a, b) => b.relevance - a.relevance);

    return NextResponse.json({
      accepted,
      incoming,
      outgoing,
      suggestions,
      stats: {
        accepted: accepted.length,
        incoming: incoming.length,
        outgoing: outgoing.length,
      },
    });
  } catch (error) {
    console.error("[ConnectionsGet] Error:", error);
    return NextResponse.json({ error: "Failed to load connections." }, { status: 500 });
  }
}

