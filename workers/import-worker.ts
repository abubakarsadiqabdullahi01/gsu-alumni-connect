import dotenv from "dotenv";
import { Worker } from "bullmq";
import {
  IMPORT_QUEUE_NAME,
  getImportQueueConnection,
} from "../lib/queue/import-queue";

dotenv.config({ path: ".env.local" });
dotenv.config();

const concurrency = Number(process.env.IMPORT_WORKER_CONCURRENCY ?? "1");
const lockDuration = Number(process.env.IMPORT_WORKER_LOCK_DURATION_MS ?? "600000"); // Increased to 10 minutes
const stalledInterval = Number(process.env.IMPORT_WORKER_STALLED_INTERVAL_MS ?? "60000"); // Check every minute
const maxStalledCount = Number(process.env.IMPORT_WORKER_MAX_STALLED_COUNT ?? "3"); // Max 3 stalled checks

const worker = new Worker(
  IMPORT_QUEUE_NAME,
  async (job) => {
    const { processImportJob } = await import("../lib/import/process-import-job");
    const data = job.data as { jobId?: string };
    const jobId = data?.jobId;
    if (!jobId) {
      throw new Error("Queue payload missing jobId");
    }
    await processImportJob(jobId);
  },
  {
    connection: getImportQueueConnection(),
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
    lockDuration: Number.isFinite(lockDuration) && lockDuration > 0 ? lockDuration : 600000,
    lockRenewTime: 300000, // Renew lock every 5 minutes
    stalledInterval:
      Number.isFinite(stalledInterval) && stalledInterval > 0 ? stalledInterval : 60000,
    maxStalledCount:
      Number.isFinite(maxStalledCount) && maxStalledCount >= 0 ? maxStalledCount : 3,
  }
);

const queueConnection = getImportQueueConnection();
queueConnection.on("error", (err) => {
  console.error("[import-worker] redis connection error:", err);
});
queueConnection.on("close", () => {
  console.warn("[import-worker] redis connection closed");
});
queueConnection.on("ready", () => {
  console.info("[import-worker] redis connection ready");
});

worker.on("ready", () => {
  console.info(
    `[import-worker] ready (queue=${IMPORT_QUEUE_NAME}, concurrency=${worker.opts.concurrency})`
  );
});

worker.on("error", (err) => {
  console.error("[import-worker] worker error:", err);
});

worker.on("stalled", (jobId) => {
  console.warn(`[import-worker] stalled job ${jobId}, will be retried`);
  // Force reconnection attempt
  const conn = getImportQueueConnection();
  if (conn && !conn.status.includes("ready")) {
    console.warn(`[import-worker] redis not ready, attempting reconnect...`);
    // Disconnect and reconnect separately
    try {
      conn.disconnect();
    } catch (e) {
      console.error("[import-worker] disconnect error:", e);
    }
    setTimeout(() => {
      conn.connect().catch((e: Error) => console.error("[import-worker] reconnect error:", e));
    }, 1000);
  }
});

worker.on("active", (job) => {
  console.info(`[import-worker] active job ${job.id}`);
});

worker.on("completed", (job) => {
  console.info(`[import-worker] completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[import-worker] failed job ${job?.id}:`, err);
  const jobId = (job?.data as { jobId?: string } | undefined)?.jobId;
  if (!jobId) return;
  void (async () => {
    const { prisma } = await import("../lib/db");
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });
  })().catch((updateError) => {
    console.error(
      `[import-worker] failed to mark ImportJob ${jobId} as FAILED:`,
      updateError
    );
  });
});

const shutdown = async (signal: string) => {
  console.info(`[import-worker] received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[import-worker] unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[import-worker] uncaughtException:", error);
});
