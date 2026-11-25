import { NextRequest, NextResponse } from "next/server";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { prisma } from "@/lib/db";

/**
 * Daily Redis round trip, so the free Upstash database is never idle long
 * enough to be deleted.
 *
 * Upstash removes free databases after 14 days without a command. The last
 * one went that way, and with it the bulk-import queue and the response
 * cache — silently, because both fall back rather than fail loudly. A write
 * and a read every day is activity, and doubles as a health check: the
 * response says whether Redis answered, and a 503 shows up in Vercel's cron
 * log.
 *
 * It also carries the one other daily chore: security-log rows older than 12
 * months are deleted, as the privacy policy promises.
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[cron/redis-keepalive] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purged = await prisma.authEvent
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } })
    .then((r) => r.count)
    .catch((error) => {
      console.error("[cron/redis-keepalive] security-log purge failed", error);
      return null;
    });

  const url = process.env.IMPORT_QUEUE_REDIS_URL ?? process.env.REDIS_URL;
  const host = url ? new URL(url).hostname : null;
  const started = Date.now();

  await redisSetJson("keepalive:last", { at: new Date().toISOString() }, 3 * 24 * 60 * 60);
  const echoed = await redisGetJson<{ at: string }>("keepalive:last");

  if (!echoed) {
    console.error(`[cron/redis-keepalive] Redis did not answer (host: ${host ?? "not configured"})`);
    return NextResponse.json({ ok: false, host, purged, error: "Redis did not answer" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, host, purged, roundTripMs: Date.now() - started, at: echoed.at });
}
