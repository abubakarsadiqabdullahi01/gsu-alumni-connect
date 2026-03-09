/* eslint-disable no-console */
const path = require("node:path");
const dotenv = require("dotenv");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("../src/generated/prisma");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasArg(flag) {
  return process.argv.includes(flag);
}

function printUsage() {
  console.log(`
Usage:
  node scripts/set-user-role.cjs --registration-no <REG_NO> [--role admin|user] [--dry-run]
  node scripts/set-user-role.cjs --email <EMAIL> [--role admin|user] [--dry-run]
  node scripts/set-user-role.cjs --user-id <USER_ID> [--role admin|user] [--dry-run]

Examples:
  pnpm auth:make-admin -- --registration-no UG18/SCZO/1080
  pnpm auth:make-admin -- --email someone@example.com
  pnpm auth:set-role -- --user-id 123e4567-e89b-12d3-a456-426614174000 --role user
`);
}

async function main() {
  const dryRun = hasArg("--dry-run");
  const roleInput = (getArg("--role") ?? "admin").trim().toLowerCase();
  if (!["admin", "user"].includes(roleInput)) {
    console.error("Invalid --role. Use 'admin' or 'user'.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const registrationNo = getArg("--registration-no");
  const email = getArg("--email");
  const userId = getArg("--user-id");
  const selectors = [registrationNo, email, userId].filter(Boolean).length;
  if (selectors !== 1) {
    console.error("Provide exactly one selector: --registration-no OR --email OR --user-id");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const where = userId
      ? { id: userId }
      : email
        ? { email: email.toLowerCase() }
        : { registrationNo: registrationNo.toUpperCase() };

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        registrationNo: true,
        role: true,
      },
    });

    if (!user) {
      console.error("User not found for provided selector.");
      process.exitCode = 1;
      return;
    }

    console.log(`${dryRun ? "[DRY RUN]" : "[APPLY]"} Found user:`);
    console.log(`  id: ${user.id}`);
    console.log(`  name: ${user.name}`);
    console.log(`  email: ${user.email ?? "(null)"}`);
    console.log(`  registrationNo: ${user.registrationNo}`);
    console.log(`  role: ${user.role ?? "user"} -> ${roleInput}`);

    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: roleInput },
      });
      console.log("Role updated successfully.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("set-user-role failed:", error);
  process.exitCode = 1;
});

