import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processImportJob } from "@/lib/import/process-import-job";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron: called every minute by Vercel (see vercel.json)
 * Also called immediately when a job is created (self-trigger in import-jobs/route.ts)
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
 * The self-trigger also sends the same header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // In production CRON_SECRET must be set. Block all requests without it.
  if (!cronSecret) {
    console.error("[cron/process-import] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/process-import] Unauthorized — bad or missing Authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Find a job to process ──────────────────────────────────────────────────
  // Pick QUEUED jobs OR RUNNING jobs whose heartbeat went stale (> 3 min ago).
  // The stale check lets us recover from a crashed/timed-out invocation.
  const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);

  const job = await prisma.importJob.findFirst({
    where: {
      OR: [
        { status: "QUEUED" },
        {
          status: "RUNNING",
          heartbeatAt: { lt: staleThreshold },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    return NextResponse.json({ message: "No pending jobs" });
  }

  // ── Atomically claim the job ───────────────────────────────────────────────
  // Update to RUNNING immediately so concurrent cron invocations (or the
  // self-trigger) don't also pick up the same job.
  const claimed = await prisma.importJob.updateMany({
    where: {
      id: job.id,
      // Guard: only claim if status hasn't changed since we read it above.
      OR: [
        { status: "QUEUED" },
        {
          status: "RUNNING",
          heartbeatAt: { lt: staleThreshold },
        },
      ],
    },
    data: {
      status: "RUNNING",
      startedAt: job.startedAt ?? new Date(),
      heartbeatAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    // Another invocation already claimed this job — nothing to do.
    console.info(`[cron/process-import] job ${job.id} already claimed by another invocation`);
    return NextResponse.json({ message: "Job already claimed", jobId: job.id });
  }

  console.info(`[cron/process-import] claimed and processing job ${job.id}`);

  try {
    await processImportJob(job.id);
    console.info(`[cron/process-import] completed job ${job.id}`);
    return NextResponse.json({ message: "Job completed", jobId: job.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/process-import] job ${job.id} failed:`, message);

    // Mark as FAILED so the watchdog doesn't loop forever retrying it.
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        heartbeatAt: new Date(),
      },
    }).catch(() => {});

    // Return 200 so Vercel doesn't disable the cron due to repeated 5xx.
    return NextResponse.json({ message: "Job failed — marked as FAILED", jobId: job.id, error: message });
  }
}