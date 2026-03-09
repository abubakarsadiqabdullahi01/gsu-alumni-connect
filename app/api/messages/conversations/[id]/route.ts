import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(
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

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_graduateId: { conversationId: id, graduateId: me.id } },
      select: { id: true },
    });
    if (!participant) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            graduate: {
              select: {
                id: true,
                fullName: true,
                registrationNo: true,
                user: { select: { image: true, lastSeenAt: true } },
              },
            },
          },
        },
      },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    let resolvedGroupName = conversation.groupName;
    if (conversation.isGroup && conversation.groupName?.startsWith("GROUP:")) {
      const groupId = conversation.groupName.replace("GROUP:", "");
      const group = await prisma.alumniGroup.findUnique({
        where: { id: groupId },
        select: { name: true },
      });
      resolvedGroupName = group?.name ?? "Group Conversation";
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id, isDeleted: false },
      orderBy: { createdAt: "asc" },
      take: 200,
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

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        isGroup: conversation.isGroup,
        groupName: resolvedGroupName,
        participants: conversation.participants.map((p) => ({
          graduateId: p.graduate.id,
          fullName: p.graduate.fullName,
          registrationNo: p.graduate.registrationNo,
          image: p.graduate.user.image,
          lastSeenAt: p.graduate.user.lastSeenAt?.toISOString() ?? null,
        })),
      },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: {
          graduateId: m.sender.id,
          fullName: m.sender.fullName,
          registrationNo: m.sender.registrationNo,
          image: m.sender.user.image,
        },
      })),
    });
  } catch (error) {
    console.error("[MessagesConversationGet] Error:", error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}
