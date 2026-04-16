#!/usr/bin/env tsx
/**
 * Test Redis and Database connections
 * Run before starting the worker to ensure connections are stable
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function testConnections() {
  console.log("🔍 Testing Connections...\n");

  // Test 1: Redis Connection
  console.log("1️⃣  Testing Redis Connection");
  console.log("---");
  try {
    const IORedis = (await import("ioredis")).default;
    const redis = new IORedis(
      process.env.IMPORT_QUEUE_REDIS_URL || process.env.REDIS_URL || "",
      {
        connectTimeout: 30000,
        socketTimeout: 45000,
        retryStrategy: (attempt) => Math.min(500 * Math.pow(2, attempt), 30000),
        reconnectOnError: () => true,
      }
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Redis connection timeout")),
        45000
      );

      redis.on("ready", () => {
        clearTimeout(timeout);
        console.log("✅ Redis connected successfully");
        console.log(`   Timeout: ${redis.options?.connectTimeout}ms`);
        console.log(`   Socket timeout: ${redis.options?.socketTimeout}ms`);
        redis.disconnect();
        resolve();
      });

      redis.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
  console.log();

  // Test 2: Database Connection
  console.log("2️⃣  Testing Database Connection");
  console.log("---");
  try {
    const prismaModule = await import("@prisma/client");
    const PrismaClient = (prismaModule as any).default.PrismaClient || (prismaModule as any).PrismaClient;
    const prisma = new PrismaClient({
      log: [],
    });

    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const duration = Date.now() - startTime;

    console.log("✅ Database connected successfully");
    console.log(`   Response time: ${duration}ms`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
  console.log();

  // Test 3: Queue Status
  console.log("3️⃣  Testing Queue Status");
  console.log("---");
  try {
    const queueModule = await import("../lib/queue/import-queue");
    const getImportQueueConnection = queueModule.getImportQueueConnection;
    const connection = getImportQueueConnection();

    // Test if we can access the queue
    const queueKey = "bull:import-jobs:";

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Queue check timeout")),
        15000
      );

      connection.once("ready", async () => {
        clearTimeout(timeout);
        try {
          const activeKey = `${queueKey}active`;
          const active = await connection.llen(activeKey);
          console.log("✅ Queue accessible");
          console.log(`   Active jobs: ${active}`);
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      connection.once("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    console.error("❌ Queue check failed:", error);
  }
  console.log();

  // Test 4: Configuration Check
  console.log("4️⃣  Configuration Check");
  console.log("---");
  const config = {
    "Connect Timeout": `${process.env.IMPORT_QUEUE_REDIS_CONNECT_TIMEOUT_MS}ms`,
    "Lock Duration": `${process.env.IMPORT_WORKER_LOCK_DURATION_MS}ms`,
    "Stalled Interval": `${process.env.IMPORT_WORKER_STALLED_INTERVAL_MS}ms`,
    "Max Stalled Count": process.env.IMPORT_WORKER_MAX_STALLED_COUNT,
    "Worker Concurrency": process.env.IMPORT_WORKER_CONCURRENCY,
  };

  Object.entries(config).forEach(([key, value]) => {
    console.log(`✅ ${key}: ${value}`);
  });
  console.log();

  console.log("🎉 All connection tests completed!");
  console.log(
    "\n💡 If all tests pass, you can safely run: pnpm worker:import"
  );
}

testConnections().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
