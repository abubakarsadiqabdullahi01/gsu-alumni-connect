import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processImportJob } from "@/lib/import/process-import-job";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro allows up to 300s

/**
 * Cron endpoint that processes one import job per invocation
 * Vercel will call this every minute (see vercel.json)
 * 
 * This is a safety net that:
 * - Processes stuck QUEUED jobs
 * - Recovers stalled RUNNING jobs (heartbeat > 2 min old)
 * - Handles jobs that weren't self-triggered for some reason
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (includes Authorization header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/process-import] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/process-import] unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pick the oldest job that is stuck
    const stuckJob = await prisma.importJob.findFirst({
      where: {
        OR: [
          // QUEUED job waiting to be picked up
          { status: "QUEUED" },
          // RUNNING job with stale heartbeat (not updated in 2 minutes)
          {
            status: "RUNNING",
            heartbeatAt: {
              lt: new Date(Date.now() - 2 * 60 * 1000),
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    if (!stuckJob) {
      console.info("[cron/process-import] no pending jobs");
      return NextResponse.json({ message: "No pending jobs" });
    }

    console.info(`[cron/process-import] processing job ${stuckJob.id}`);

    // Mark as RUNNING and update heartbeat to claim it
    await prisma.importJob.update({
      where: { id: stuckJob.id },
      data: {
        status: "RUNNING",
        heartbeatAt: new Date(),
      },
    });

    // Process the job (may take up to 5 minutes)
    await processImportJob(stuckJob.id);

    console.info(`[cron/process-import] completed job ${stuckJob.id}`);
    return NextResponse.json({ message: "Job completed", jobId: stuckJob.id });
  } catch (err) {
    console.error("[cron/process-import] error:", err);

    // Don't fail the cron—just log and let the next run retry
    return NextResponse.json(
      {
        message: "Job processing failed (will retry)",
        error: String(err),
      },
      { status: 200 } // Still return 200 so Vercel doesn't disable the cron
    );
  }
}
