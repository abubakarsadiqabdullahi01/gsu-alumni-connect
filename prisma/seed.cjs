/* eslint-disable no-console */
/**
 * prisma/seed.cjs
 *
 * Idempotent default seed:
 * - Ensures one login-ready ADMIN user exists
 * - Ensures credential account exists and password is set
 * - Ensures admin platform settings row exists
 *
 * Environment overrides (optional):
 *   SEED_ADMIN_REGISTRATION_NO=UG00/ADMIN/0001
 *   SEED_ADMIN_PASSWORD=Admin@123
 *   SEED_ADMIN_NAME=System Administrator
 *   SEED_ADMIN_EMAIL=admin@alumni.gsu.edu.ng
 */

const path = require("node:path");
const { scrypt, randomBytes } = require("node:crypto");
const dotenv = require("dotenv");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("../src/generated/prisma");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });

const DEFAULT_ADMIN_SETTINGS = {
  id: "main",
  platformName: "GSU Alumni Connect",
  supportEmail: "alumni@gsu.edu.ng",
  welcomeMessage: "Welcome to GSU Alumni Connect! Complete your profile to get started.",
  allowSelfRegistration: false,
  requireEmailVerification: true,
  forcePasswordChangeOnFirst: true,
  enableTwoFactor: true,
  featureJobBoard: true,
  featureMentorship: true,
  featureMessaging: true,
  featureMap: true,
  featureGroups: true,
  featureSkills: false,
};

function scryptAsync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL");
  }

  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const registrationNo = (
    process.env.SEED_ADMIN_REGISTRATION_NO || "UG00/ADMIN/0001"
  ).trim().toUpperCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const name = (process.env.SEED_ADMIN_NAME || "System Administrator").trim();
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@alumni.gsu.edu.ng")
    .trim()
    .toLowerCase();

  try {
    const passwordHash = await hashPassword(password);

    const adminUser = await prisma.user.upsert({
      where: { registrationNo },
      update: {
        role: "admin",
        accountStatus: "ACTIVE",
        defaultPassword: false,
        name,
        email,
        emailVerified: true,
      },
      create: {
        registrationNo,
        role: "admin",
        accountStatus: "ACTIVE",
        defaultPassword: false,
        name,
        email,
        emailVerified: true,
      },
      select: {
        id: true,
        registrationNo: true,
        email: true,
      },
    });

    const existingCredential = await prisma.account.findFirst({
      where: {
        userId: adminUser.id,
        providerId: "credential",
      },
      select: { id: true },
    });

    if (existingCredential) {
      await prisma.account.update({
        where: { id: existingCredential.id },
        data: {
          accountId: registrationNo,
          password: passwordHash,
        },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: adminUser.id,
          providerId: "credential",
          accountId: registrationNo,
          password: passwordHash,
        },
      });
    }

    await prisma.adminSetting.upsert({
      where: { id: "main" },
      update: {},
      create: DEFAULT_ADMIN_SETTINGS,
    });

    console.log("[seed] Default admin is ready.");
    console.log(`[seed] registrationNo: ${registrationNo}`);
    console.log(`[seed] email: ${email}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[seed] Failed:", error?.message || error);
  process.exitCode = 1;
});

