import { Queue } from "bullmq";
import IORedis from "ioredis";

export const IMPORT_QUEUE_NAME = "import-jobs";

declare global {
  var __importQueueRedis__: IORedis | undefined;
  var __importJobsQueue__: Queue | undefined;
}

function getRedisUrl() {
  const url = process.env.IMPORT_QUEUE_REDIS_URL ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "Missing IMPORT_QUEUE_REDIS_URL (or REDIS_URL) for import queue connection."
    );
  }
  return url;
}

function getRedisConnection() {
  if (!globalThis.__importQueueRedis__) {
    const redis = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: Number(process.env.IMPORT_QUEUE_REDIS_CONNECT_TIMEOUT_MS ?? "10000"),
      keepAlive: Number(process.env.IMPORT_QUEUE_REDIS_KEEPALIVE_MS ?? "30000"),
      retryStrategy: (attempt) => {
        const base = Number(process.env.IMPORT_QUEUE_REDIS_RETRY_BASE_MS ?? "250");
        const max = Number(process.env.IMPORT_QUEUE_REDIS_RETRY_MAX_MS ?? "8000");
        return Math.min(base * 2 ** Math.min(attempt, 6), max);
      },
      reconnectOnError: () => true,
    });

    redis.on("error", (err) => {
      console.error("[import-queue] redis error:", err);
    });
    redis.on("reconnecting", (delay: number) => {
      console.warn(`[import-queue] redis reconnecting in ${delay}ms`);
    });
    redis.on("ready", () => {
      console.info("[import-queue] redis ready");
    });

    globalThis.__importQueueRedis__ = redis;
  }
  return globalThis.__importQueueRedis__;
}

export function getImportQueueConnection() {
  return getRedisConnection();
}

export function getImportJobsQueue() {
  if (!globalThis.__importJobsQueue__) {
    globalThis.__importJobsQueue__ = new Queue(IMPORT_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return globalThis.__importJobsQueue__;
}

export async function enqueueImportJob(jobId: string) {
  const queue = getImportJobsQueue();
  await queue.add("process-import-job", { jobId }, { jobId });
}
