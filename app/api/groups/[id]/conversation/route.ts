import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

async function syncMembers(conversationId: string, groupId: string) {
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
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_graduateId: {
          groupId: id,
          graduateId: me.id,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Join group to chat." }, { status: 403 });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        isGroup: true,
        groupName: `GROUP:${id}`,
      },
      select: { id: true },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: true,
          groupName: `GROUP:${id}`,
        },
        select: { id: true },
      });
    }

    await syncMembers(conversation.id, id);

    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error("[GroupConversation] Error:", error);
    return NextResponse.json({ error: "Failed to open group conversation." }, { status: 500 });
  }
}
