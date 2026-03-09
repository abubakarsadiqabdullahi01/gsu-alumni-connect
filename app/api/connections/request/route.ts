import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { receiverGraduateId?: string };
    const receiverGraduateId = body.receiverGraduateId?.trim();
    if (!receiverGraduateId) {
      return NextResponse.json({ error: "Receiver is required." }, { status: 400 });
    }

    const requester = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!requester) {
      return NextResponse.json({ error: "Requester profile not found." }, { status: 404 });
    }
    if (requester.id === receiverGraduateId) {
      return NextResponse.json({ error: "You cannot connect to yourself." }, { status: 400 });
    }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: requester.id, receiverId: receiverGraduateId },
          { requesterId: receiverGraduateId, receiverId: requester.id },
        ],
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existing) {
      if (existing.status === "BLOCKED") {
        return NextResponse.json(
          { error: "Unable to send request for this user." },
          { status: 403 }
        );
      }

      if (existing.status === "DECLINED") {
        const revived = await prisma.connection.update({
          where: { id: existing.id },
          data: {
            requesterId: requester.id,
            receiverId: receiverGraduateId,
            status: "PENDING",
          },
          select: { id: true, status: true },
        });

        return NextResponse.json({
          success: true,
          status: revived.status,
          connectionId: revived.id,
          existing: false,
        });
      }

      return NextResponse.json(
        {
          success: true,
          status: existing.status,
          connectionId: existing.id,
          existing: true,
        },
        { status: 200 }
      );
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: requester.id,
        receiverId: receiverGraduateId,
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: connection.status,
      connectionId: connection.id,
      existing: false,
    });
  } catch (error) {
    console.error("[ConnectionRequest] Error:", error);
    return NextResponse.json({ error: "Failed to send connection request." }, { status: 500 });
  }
}
