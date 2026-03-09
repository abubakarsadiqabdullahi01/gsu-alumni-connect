import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPusherServer } from "@/lib/pusher-server";
import { isFeatureEnabled } from "@/lib/platform-settings";

async function syncGroupParticipants(conversationId: string, groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { graduateId: true },
  });
  if (!members.length) return;
  await prisma.conversationParticipant.createMany({
    data: members.map((m) => ({ conversationId, graduateId: m.graduateId })),
    skipDuplicates: true,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isFeatureEnabled("featureMessaging"))) {
      return NextResponse.json({ error: "Messaging feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, isGroup: true, groupName: true },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    if (conversation.isGroup && conversation.groupName?.startsWith("GROUP:")) {
      const groupId = conversation.groupName.replace("GROUP:", "");
      await syncGroupParticipants(id, groupId);
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_graduateId: {
          conversationId: id,
          graduateId: me.id,
        },
      },
      select: { id: true },
    });
    if (!participant) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const body = (await req.json()) as { body?: string };
    const text = body.body?.trim() ?? "";
    if (text.length < 1) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    const created = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: me.id,
        body: text,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            registrationNo: true,
            user: { select: { image: true } },
          },
        },
      },
    });

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, graduateId: me.id },
      data: { lastReadAt: new Date() },
    });

    const payload = {
      id: created.id,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
      sender: {
        graduateId: created.sender.id,
        fullName: created.sender.fullName,
        registrationNo: created.sender.registrationNo,
        image: created.sender.user.image,
      },
    };

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(`private-conversation-${id}`, "message:new", payload);
    }

    return NextResponse.json({ success: true, message: payload });
  } catch (error) {
    console.error("[MessagesSend] Error:", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
