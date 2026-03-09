import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPusherServer } from "@/lib/pusher-server";
import { isFeatureEnabled } from "@/lib/platform-settings";

function parseChannel(
  channelName: string
): { type: "conversation" | "group"; id: string; isPresence: boolean } | null {
  const conversationPrefix = "private-conversation-";
  const groupPrefix = "private-group-";
  const presenceConversationPrefix = "presence-conversation-";
  const presenceGroupPrefix = "presence-group-";
  if (channelName.startsWith(conversationPrefix)) {
    return { type: "conversation", id: channelName.slice(conversationPrefix.length), isPresence: false };
  }
  if (channelName.startsWith(groupPrefix)) {
    return { type: "group", id: channelName.slice(groupPrefix.length), isPresence: false };
  }
  if (channelName.startsWith(presenceConversationPrefix)) {
    return {
      type: "conversation",
      id: channelName.slice(presenceConversationPrefix.length),
      isPresence: true,
    };
  }
  if (channelName.startsWith(presenceGroupPrefix)) {
    return { type: "group", id: channelName.slice(presenceGroupPrefix.length), isPresence: true };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const pusher = getPusherServer();
    if (!pusher) {
      return NextResponse.json({ error: "Pusher is not configured." }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const socketId = String(form.get("socket_id") ?? "");
    const channelName = String(form.get("channel_name") ?? "");
    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Invalid auth payload." }, { status: 400 });
    }

    const parsed = parseChannel(channelName);
    if (!parsed) {
      return NextResponse.json({ error: "Unsupported channel." }, { status: 403 });
    }

    const messagingEnabled = await isFeatureEnabled("featureMessaging");
    const groupsEnabled = await isFeatureEnabled("featureGroups");
    if (!messagingEnabled) {
      return NextResponse.json({ error: "Messaging feature is disabled by admin." }, { status: 403 });
    }
    if (parsed.type === "group" && !groupsEnabled) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, registrationNo: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    if (parsed.type === "conversation") {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_graduateId: {
            conversationId: parsed.id,
            graduateId: me.id,
          },
        },
        select: { id: true },
      });
      if (!participant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_graduateId: {
            groupId: parsed.id,
            graduateId: me.id,
          },
        },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const authResponse = parsed.isPresence
      ? pusher.authorizeChannel(socketId, channelName, {
          user_id: me.id,
          user_info: {
            fullName: me.fullName,
            registrationNo: me.registrationNo,
          },
        })
      : pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[PusherAuth] Error:", error);
    return NextResponse.json({ error: "Failed to authorize channel." }, { status: 500 });
  }
}
