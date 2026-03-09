import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMessaging"))) {
      return NextResponse.json({ error: "Messaging feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { graduateId?: string };
    const targetGraduateId = body.graduateId?.trim();
    if (!targetGraduateId) {
      return NextResponse.json({ error: "Target graduate is required." }, { status: 400 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, allowMessages: true },
    });
    if (!me) return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    if (me.id === targetGraduateId) {
      return NextResponse.json({ error: "Cannot create conversation with yourself." }, { status: 400 });
    }

    const target = await prisma.graduate.findUnique({
      where: { id: targetGraduateId },
      select: { id: true, allowMessages: true, user: { select: { accountStatus: true } } },
    });
    if (!target || target.user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Target graduate not available." }, { status: 404 });
    }
    if (!target.allowMessages) {
      return NextResponse.json({ error: "This user does not allow direct messages." }, { status: 403 });
    }

    const existingList = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { graduateId: me.id } } },
          { participants: { some: { graduateId: targetGraduateId } } },
          { participants: { every: { graduateId: { in: [me.id, targetGraduateId] } } } },
        ],
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const existing = existingList[0];
    if (existing) {
      return NextResponse.json({ conversationId: existing.id, existing: true });
    }

    const created = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ graduateId: me.id }, { graduateId: targetGraduateId }],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ conversationId: created.id, existing: false });
  } catch (error) {
    console.error("[MessagesDirect] Error:", error);
    return NextResponse.json({ error: "Failed to create/open conversation." }, { status: 500 });
  }
}
