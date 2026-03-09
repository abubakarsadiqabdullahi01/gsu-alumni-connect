/* eslint-disable no-console */
const { scrypt, randomBytes } = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("../src/generated/prisma");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function scryptAsync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

function generateDefaultPassword(registrationNo) {
  const normalized = registrationNo.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/UG(\d{2})/i);
  const year = match ? `20${match[1]}` : "0000";
  return `${normalized}${year}`;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    where: { defaultPassword: true },
    select: {
      id: true,
      registrationNo: true,
      accounts: {
        where: { providerId: "credential" },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!users.length) {
    console.log("No users with defaultPassword=true found.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(
    `${dryRun ? "[DRY RUN]" : "[APPLY]"} Users to process: ${users.length}`
  );

  let updated = 0;
  let createdAccounts = 0;
  let failed = 0;

  for (const user of users) {
    const defaultPassword = generateDefaultPassword(user.registrationNo);
    const hasCredentialAccount = user.accounts.length > 0;

    console.log(`${user.registrationNo} -> ${defaultPassword}`);

    if (dryRun) continue;

    try {
      const hash = await hashPassword(defaultPassword);
      if (hasCredentialAccount) {
        await prisma.account.update({
          where: { id: user.accounts[0].id },
          data: { password: hash },
        });
      } else {
        await prisma.account.create({
          data: {
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: hash,
          },
        });
        createdAccounts++;
      }
      updated++;
    } catch (error) {
      failed++;
      console.error(`Failed for ${user.registrationNo}:`, error);
    }
  }

  if (!dryRun) {
    console.log(
      `Done. Updated: ${updated}, Created credential accounts: ${createdAccounts}, Failed: ${failed}`
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Reset script failed:", error);
  process.exitCode = 1;
});
