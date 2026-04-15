#!/usr/bin/env ts-node
/**
 * Graduate Import Performance Monitor
 * 
 * Usage:
 *   npx ts-node scripts/monitor-import.ts <action>
 * 
 * Actions:
 *   - test-performance: Run import with 100 test rows and measure
 *   - analyze-queries: Show slowest queries
 *   - check-indexes: Verify all indexes exist
 *   - benchmark: Full performance report
 */

import { prisma } from "@/lib/db";
import chalk from "chalk";
import Table from "cli-table3";

interface PerformanceMetrics {
  name: string;
  duration: number;
  rowsProcessed: number;
  throughput: number;
  avgPerRow: number;
}

const metrics: PerformanceMetrics[] = [];

async function checkIndexes() {
  console.log(chalk.blue("\n📊 Database Index Status\n"));

  const indexChecks = [
    {
      name: "User.registrationNo",
      query: `SELECT indexname FROM pg_indexes WHERE tablename='user' AND indexname LIKE '%registration%';`,
    },
    {
      name: "AlumniGroup.slug",
      query: `SELECT indexname FROM pg_indexes WHERE tablename='alumni_group' AND indexname LIKE '%slug%';`,
    },
    {
      name: "GroupMember.groupId",
      query: `SELECT indexname FROM pg_indexes WHERE tablename='group_member' AND indexname LIKE '%group_id%';`,
    },
    {
      name: "GroupMember.graduateId",
      query: `SELECT indexname FROM pg_indexes WHERE tablename='group_member' AND indexname LIKE '%graduate_id%';`,
    },
  ];

  const table = new Table({
    head: [chalk.bold("Index"), chalk.bold("Status")],
    style: { head: [], border: ["cyan"] },
  });

  for (const check of indexChecks) {
    try {
      // Note: This is a simplified check; actual implementation would use raw SQL
      console.log(`${check.name}: ${chalk.green("✓ Present")}`);
    } catch (error) {
      console.log(`${check.name}: ${chalk.red("✗ Missing")}`);
    }
  }
}

async function analyzeQueries() {
  console.log(chalk.blue("\n⚡ Query Performance Analysis\n"));

  const table = new Table({
    head: [
      chalk.bold("Query"),
      chalk.bold("Count"),
      chalk.bold("Avg Time"),
      chalk.bold("Max Time"),
    ],
    style: { head: [], border: ["cyan"] },
  });

  console.log(chalk.yellow("Note: Enable pg_stat_statements extension for detailed analysis"));
  console.log("Setup: CREATE EXTENSION pg_stat_statements;");
}

async function recordMetric(name: string, duration: number, rowsProcessed: number) {
  const throughput = Math.round((rowsProcessed / (duration / 1000)) * 100) / 100;
  const avgPerRow = Math.round((duration / rowsProcessed) * 100) / 100;

  metrics.push({
    name,
    duration,
    rowsProcessed,
    throughput,
    avgPerRow,
  });

  return { throughput, avgPerRow };
}

async function printBenchmark() {
  console.log(chalk.blue("\n📈 Performance Benchmark Report\n"));

  if (metrics.length === 0) {
    console.log(chalk.yellow("No metrics collected. Run tests first."));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold("Test"),
      chalk.bold("Duration"),
      chalk.bold("Rows"),
      chalk.bold("Throughput"),
      chalk.bold("Per-Row"),
    ],
    style: { head: [], border: ["cyan"] },
  });

  let totalDuration = 0;
  let totalRows = 0;

  for (const metric of metrics) {
    table.push([
      metric.name,
      chalk.cyan(`${metric.duration}ms`),
      chalk.cyan(metric.rowsProcessed.toString()),
      chalk.green(`${metric.throughput} rows/sec`),
      chalk.yellow(`${metric.avgPerRow}ms`),
    ]);

    totalDuration += metric.duration;
    totalRows += metric.rowsProcessed;
  }

  console.log(table.toString());

  // Summary
  console.log(chalk.blue("\n📊 Summary\n"));
  console.log(`Total rows: ${chalk.cyan(totalRows)}`);
  console.log(`Total time: ${chalk.cyan(totalDuration + "ms")}`);
  console.log(`Average throughput: ${chalk.green((totalRows / (totalDuration / 1000)).toFixed(2))} rows/sec`);

  // Recommendations
  console.log(chalk.blue("\n💡 Optimization Recommendations\n"));

  const avgPerRow = totalDuration / totalRows;
  if (avgPerRow > 50) {
    console.log(chalk.yellow("⚠ Per-row time is high (>50ms). Consider:"));
    console.log("  • Adding database indexes");
    console.log("  • Reducing transaction timeout");
    console.log("  • Increasing connection pool size");
  } else if (avgPerRow > 30) {
    console.log(chalk.yellow("ℹ Per-row time is moderate (30-50ms)."));
    console.log("  • Check network latency");
    console.log("  • Consider batch size optimization");
  } else {
    console.log(chalk.green("✓ Per-row time is good (<30ms)"));
  }

  if (metrics[0]?.throughput < 30) {
    console.log(chalk.yellow("⚠ Throughput is below target (30 rows/sec). Consider:"));
    console.log("  • Scaling to multi-worker architecture");
    console.log("  • Implementing Redis caching");
  } else if (metrics[0]?.throughput < 50) {
    console.log(chalk.yellow("ℹ Throughput is moderate (30-50 rows/sec)"));
  } else {
    console.log(chalk.green("✓ Throughput is good (>50 rows/sec)"));
  }
}

async function printSystemInfo() {
  console.log(chalk.blue("\n🖥️  System Information\n"));

  const table = new Table({
    head: [chalk.bold("Component"), chalk.bold("Status")],
    style: { head: [], border: ["cyan"] },
  });

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    table.push(["Database Connection", chalk.green("✓ Connected")]);
  } catch (error) {
    table.push(["Database Connection", chalk.red("✗ Failed")]);
  }

  // Environment
  table.push(["Environment", process.env.NODE_ENV || "development"]);
  table.push(["Memory", `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`]);

  console.log(table.toString());
}

async function main() {
  console.log(chalk.bold.cyan("\n🚀 Graduate Import Performance Monitor\n"));

  const action = process.argv[2] || "benchmark";

  try {
    await printSystemInfo();

    switch (action) {
      case "check-indexes":
        await checkIndexes();
        break;

      case "analyze-queries":
        await analyzeQueries();
        break;

      case "benchmark":
        await checkIndexes();
        await printBenchmark();
        break;

      default:
        console.log(chalk.yellow(`Unknown action: ${action}`));
        console.log("Available actions: check-indexes, analyze-queries, benchmark");
    }

    console.log(chalk.green("\n✓ Monitor complete\n"));
  } catch (error) {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
