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

// Use TLS for managed databases (Neon/Vercel); keep local DB simple.
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
