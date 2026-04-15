import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redisSetNxWithTtl } from "@/lib/cache/redis-cache";

const PRESENCE_DB_WRITE_INTERVAL_SECONDS = Math.max(
  10,
  Number.parseInt(process.env.PRESENCE_DB_WRITE_INTERVAL_SECONDS ?? "90", 10) || 90
);

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const throttled = await redisSetNxWithTtl(
      `presence:write-lock:${session.user.id}`,
      String(now.getTime()),
      PRESENCE_DB_WRITE_INTERVAL_SECONDS
    );

    if (!throttled) {
      await prisma.user.updateMany({
        where: {
          id: session.user.id,
          OR: [
            { lastSeenAt: null },
            {
              lastSeenAt: {
                lt: new Date(now.getTime() - PRESENCE_DB_WRITE_INTERVAL_SECONDS * 1000),
              },
            },
          ],
        },
        data: { lastSeenAt: now },
      });
    }

    return NextResponse.json({
      ok: true,
      throttled,
      writeIntervalSeconds: PRESENCE_DB_WRITE_INTERVAL_SECONDS,
    });
  } catch (error) {
    console.error("[PresenceHeartbeat] Error:", error);
    return NextResponse.json({ error: "Failed to update presence heartbeat." }, { status: 500 });
  }
}
