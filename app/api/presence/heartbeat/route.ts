import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PresenceHeartbeat] Error:", error);
    return NextResponse.json({ error: "Failed to update presence heartbeat." }, { status: 500 });
  }
}
