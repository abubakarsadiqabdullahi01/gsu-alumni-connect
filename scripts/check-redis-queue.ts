#!/usr/bin/env tsx
/**
 * Monitor Redis Queue directly
 * Shows all jobs in the import queue
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

async function checkQueue() {
  try {
    console.log("📊 Import Queue Status\n");

    // Get queue info
    const queueKey = "bull:import-jobs:";
    
    // Check active jobs
    const activeKey = `${queueKey}active`;
    const activeJobs = await redis.lrange(activeKey, 0, -1);
    
    // Check waiting jobs
    const waitKey = `${queueKey}wait`;
    const waitingJobs = await redis.lrange(waitKey, 0, -1);
    
    // Check completed jobs
    const completedKey = `${queueKey}completed`;
    const completedJobs = await redis.lrange(completedKey, 0, -1);
    
    // Check failed jobs
    const failedKey = `${queueKey}failed`;
    const failedJobs = await redis.lrange(failedKey, 0, -1);

    console.log(`📈 Queue Overview:`);
    console.log(`   🟢 Active:    ${activeJobs.length} job(s)`);
    console.log(`   ⏳ Waiting:    ${waitingJobs.length} job(s)`);
    console.log(`   ✅ Completed: ${completedJobs.length} job(s)`);
    console.log(`   ❌ Failed:    ${failedJobs.length} job(s)`);

    if (activeJobs.length > 0) {
      console.log(`\n🟢 Active Jobs:`);
      for (const jobId of activeJobs) {
        console.log(`   - ${jobId}`);
      }
    }

    if (waitingJobs.length > 0) {
      console.log(`\n⏳ Waiting Jobs:`);
      for (const jobId of waitingJobs) {
        console.log(`   - ${jobId}`);
      }
    }

    console.log("\n✅ Queue check complete\n");
  } catch (error) {
    console.error("❌ Error checking queue:", error);
    process.exit(1);
  }
}

checkQueue();
