import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Action = "accept" | "decline" | "cancel" | "block";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as { action?: Action };
    const action = body.action;
    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const connection = await prisma.connection.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }

    const isParticipant =
      connection.requesterId === me.id || connection.receiverId === me.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (action === "accept") {
      if (connection.receiverId !== me.id || connection.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot accept this request." }, { status: 400 });
      }
      await prisma.connection.update({
        where: { id: connection.id },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({ success: true, status: "ACCEPTED" });
    }

    if (action === "decline") {
      if (connection.receiverId !== me.id || connection.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot decline this request." }, { status: 400 });
      }
      await prisma.connection.update({
        where: { id: connection.id },
        data: { status: "DECLINED" },
      });
      return NextResponse.json({ success: true, status: "DECLINED" });
    }

    if (action === "cancel") {
      if (connection.requesterId !== me.id || connection.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot cancel this request." }, { status: 400 });
      }
      await prisma.connection.delete({ where: { id: connection.id } });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    if (action === "block") {
      await prisma.connection.update({
        where: { id: connection.id },
        data: { status: "BLOCKED" },
      });
      return NextResponse.json({ success: true, status: "BLOCKED" });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("[ConnectionsPatch] Error:", error);
    return NextResponse.json({ error: "Failed to update connection." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const connection = await prisma.connection.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    if (connection.requesterId !== me.id && connection.receiverId !== me.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.connection.delete({ where: { id: connection.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ConnectionsDelete] Error:", error);
    return NextResponse.json({ error: "Failed to remove connection." }, { status: 500 });
  }
}

