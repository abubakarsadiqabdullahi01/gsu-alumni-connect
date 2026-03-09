import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

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

    const group = await prisma.alumniGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const membership = await prisma.groupMember.upsert({
      where: {
        groupId_graduateId: {
          groupId: id,
          graduateId: me.id,
        },
      },
      create: {
        groupId: id,
        graduateId: me.id,
        role: "MEMBER",
      },
      update: {},
      select: { id: true, role: true, joinedAt: true },
    });

    return NextResponse.json({
      success: true,
      membership: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[GroupJoin] Error:", error);
    return NextResponse.json({ error: "Failed to join group." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isFeatureEnabled("featureGroups"))) {
      return NextResponse.json({ error: "Groups feature is disabled by admin." }, { status: 403 });
    }

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

    await prisma.groupMember.deleteMany({
      where: {
        groupId: id,
        graduateId: me.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GroupLeave] Error:", error);
    return NextResponse.json({ error: "Failed to leave group." }, { status: 500 });
  }
}
