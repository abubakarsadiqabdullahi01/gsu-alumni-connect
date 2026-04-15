import { PrismaClient } from "@/src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = isProduction
  ? process.env.DATABASE_URL ?? process.env.DIRECT_URL
  : process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL is required. Please set it in your Vercel environment variables: " +
      "https://vercel.com/humsadtechnologies/gsu-alumni-connect/settings/environment-variables"
  );
}

const isLocalDatabase = /localhost|127\.0\.0\.1/i.test(databaseUrl);

const poolMin = Number(process.env.DB_POOL_MIN ?? 0);
const poolMax = Number(process.env.DB_POOL_MAX ?? (isLocalDatabase ? 5 : 3));
const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10_000);
const connectionTimeoutMillis = Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 15_000);
const statementTimeoutMillis = Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000);
const keepAliveInitialDelayMillis = Number(
  process.env.DB_KEEPALIVE_INITIAL_DELAY_MS ?? 30_000
);

const safePoolMin = Number.isFinite(poolMin) && poolMin >= 0 ? poolMin : 0;
const safePoolMax = Number.isFinite(poolMax) && poolMax > 0 ? poolMax : isLocalDatabase ? 5 : 3;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  min: safePoolMin,
  max: Math.max(safePoolMin + 1, safePoolMax),
  idleTimeoutMillis,
  connectionTimeoutMillis,
  statement_timeout: statementTimeoutMillis,
  keepAlive: true,
  keepAliveInitialDelayMillis,
});

pool.on("error", (error) => {
  console.error("[db] pg pool error:", error);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
