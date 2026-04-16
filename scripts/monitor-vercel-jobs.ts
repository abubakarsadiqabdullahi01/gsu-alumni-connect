#!/usr/bin/env tsx
/**
 * Monitor import jobs running on Vercel
 * Usage: pnpm tsx scripts/monitor-vercel-jobs.ts <JOB_ID> [VERCEL_URL]
 * Example: pnpm tsx scripts/monitor-vercel-jobs.ts f8acb5a7-a1e6-45a0-a15e-6c28d9fdf44d https://gsu-alumni-connect.vercel.app
 */

const jobId = process.argv[2];
const vercelUrl = process.argv[3] || "https://gsu-alumni-connect.vercel.app";

if (!jobId) {
  console.error("❌ Usage: tsx scripts/monitor-vercel-jobs.ts <JOB_ID> [VERCEL_URL]");
  process.exit(1);
}

async function checkJobStatus() {
  try {
    const apiUrl = `${vercelUrl}/api/import-jobs/${jobId}`;
    console.log(`📡 Polling: ${apiUrl}\n`);

    let isRunning = true;
    let lastStatus = null;
    let checkCount = 0;

    while (isRunning) {
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      checkCount++;
      const timestamp = new Date().toLocaleTimeString();

      if (!data.job) {
        console.log(`[${timestamp}] ⚠️  Job not found`);
        break;
      }

      const {
        status,
        progress,
        stats,
        error,
        completedAt,
      } = data.job;

      // Show detailed progress
      if (JSON.stringify(data.job) !== JSON.stringify(lastStatus)) {
        console.log(`[${timestamp}] 📊 Job Status: ${status}`);
        
        if (progress) {
          const percentage = ((progress.processed / progress.total) * 100).toFixed(1);
          console.log(`   Progress: ${progress.processed}/${progress.total} (${percentage}%)`);
        }

        if (stats) {
          console.log(`   Stats:
     - Created: ${stats.created}
     - Updated: ${stats.updated}
     - Failed: ${stats.failed}
     - Parse Warnings: ${stats.parseWarnings || 0}`);
        }

        if (error) {
          console.log(`   ❌ Error: ${error}`);
        }

        if (completedAt) {
          console.log(`   ✅ Completed at: ${new Date(completedAt).toLocaleString()}`);
        }

        lastStatus = JSON.parse(JSON.stringify(data.job));
      }

      // Check if job is complete
      if (status === "completed" || status === "failed") {
        isRunning = false;
        console.log(`\n✅ Job ${status.toUpperCase()}\n`);
        process.exit(status === "completed" ? 0 : 1);
      }

      // Poll every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("❌ Error checking job status:", error);
    process.exit(1);
  }
}

checkJobStatus();
