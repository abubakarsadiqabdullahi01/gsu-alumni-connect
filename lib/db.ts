import { PrismaClient } from "@/src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Please set it in your Vercel environment variables: " +
    "https://vercel.com/humsadtechnologies/gsu-alumni-connect/settings/environment-variables"
  );
}

const isLocalDatabase = /localhost|127\.0\.0\.1/i.test(databaseUrl);

// ✅ ENTERPRISE: Connection pool configuration for long-running operations
// These settings prevent connection timeouts during bulk imports
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  // ✅ Min/max connections to handle concurrent requests
  min: 5,                          // Always maintain 5 idle connections
  max: isLocalDatabase ? 10 : 20,  // Up to 10 local, 20 production connections
  // ✅ Idle timeout - connection closes after 30 min of inactivity
  idleTimeoutMillis: 30000,
  // ✅ Connection creation timeout - 5 seconds to acquire a connection
  connectionTimeoutMillis: 5000,
  // ✅ Maximum statement timeout (some db providers)
  statement_timeout: 30000,        // 30 seconds per statement
  // ✅ Keep-alive settings to prevent network timeouts
  keepAlive: true,
  keepAliveInitialDelayMillis: 30000,  // Send keep-alive every 30 seconds
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
