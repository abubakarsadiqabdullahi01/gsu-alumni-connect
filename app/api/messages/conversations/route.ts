import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMessaging"))) {
      return NextResponse.json({ error: "Messaging feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

    const rows = await prisma.conversationParticipant.findMany({
      where: { graduateId: me.id },
      include: {
        conversation: {
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
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: { id: true, fullName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
      take: 100,
    });

    const groupConversationIds = rows
      .map((r) => r.conversation.groupName)
      .filter((g): g is string => Boolean(g && g.startsWith("GROUP:")))
      .map((g) => g.replace("GROUP:", ""));

    const groups = groupConversationIds.length
      ? await prisma.alumniGroup.findMany({
          where: { id: { in: groupConversationIds } },
          select: { id: true, name: true },
        })
      : [];
    const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

    const conversations = await Promise.all(
      rows.map(async (row) => {
        const conv = row.conversation;
        const last = conv.messages[0] ?? null;

        const otherParticipants = conv.participants
          .filter((p) => p.graduateId !== me.id)
          .map((p) => p.graduate);

        const title = conv.isGroup
          ? conv.groupName?.startsWith("GROUP:")
            ? groupNameById.get(conv.groupName.replace("GROUP:", "")) ?? "Group Conversation"
            : conv.groupName ?? "Group Conversation"
          : otherParticipants[0]?.fullName ?? "Direct Conversation";

        const avatar = conv.isGroup ? null : otherParticipants[0]?.user.image ?? null;

        const unread = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: me.id },
            createdAt: {
              gt: row.lastReadAt ?? new Date(0),
            },
          },
        });

        return {
          id: conv.id,
          isGroup: conv.isGroup,
          title,
          avatar,
          participants: otherParticipants.map((p) => ({
            graduateId: p.id,
            fullName: p.fullName,
            registrationNo: p.registrationNo,
            image: p.user.image,
            lastSeenAt: p.user.lastSeenAt?.toISOString() ?? null,
          })),
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                createdAt: last.createdAt.toISOString(),
                senderName: last.sender.fullName,
              }
            : null,
          unreadCount: unread,
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    const deduped = new Map<string, (typeof conversations)[number]>();
    for (const conv of conversations) {
      const directPeerKey = conv.participants
        .map((p) => p.graduateId)
        .sort()
        .join(",");
      const key = conv.isGroup ? `group:${conv.id}` : `direct:${directPeerKey}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, conv);
        continue;
      }

      const convTime = new Date(conv.updatedAt).getTime();
      const existingTime = new Date(existing.updatedAt).getTime();
      if (convTime > existingTime) {
        deduped.set(key, conv);
      }
    }

    const normalized = [...deduped.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ conversations: normalized, selfGraduateId: me.id });
  } catch (error) {
    console.error("[MessagesConversations] Error:", error);
    return NextResponse.json({ error: "Failed to load conversations." }, { status: 500 });
  }
}
