/* eslint-disable no-console */
/**
 * scripts/setup-admin.cjs
 *
 * Create admin users with unique credentials (registration number + password).
 * Run once during initial setup, or add new admins as needed.
 *
 * Usage:
 *   node scripts/setup-admin.cjs --registration-no UG19/ADMIN/001 --password "YourSecurePassword123!"
 *   node scripts/setup-admin.cjs --email admin@alumni.gsu.edu.ng --password "YourSecurePassword123!" --name "Admin Name"
 *   node scripts/setup-admin.cjs --dry-run (preview without creating)
 */

const { scrypt, randomBytes } = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("../src/generated/prisma");

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
╔════════════════════════════════════════════════════════════════════════════╗
║                      ADMIN USER SETUP SCRIPT                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/setup-admin.cjs --registration-no <REG_NO> --password <PASS> [--name <NAME>]
  node scripts/setup-admin.cjs --email <EMAIL> --password <PASS> [--name <NAME>]
  node scripts/setup-admin.cjs --dry-run

Examples:
  # Create admin with registration number (preferred for GSU alumni)
  node scripts/setup-admin.cjs --registration-no UG19/ADMIN/001 --password "SecureAdmin123!" --name "Admin User"

  # Create admin with email (for external admins)
  node scripts/setup-admin.cjs --email admin@alumni.gsu.edu.ng --password "SecureAdmin123!" --name "Admin Name"

  # Preview without creating
  node scripts/setup-admin.cjs --dry-run

Requirements:
  --registration-no  Registration number OR
  --email           Email address
  --password        Secure password (min 8 characters, must include uppercase, number, special char)
  --name           Full name (optional, auto-generated if not provided)
  --dry-run         Preview changes without saving to database
  `);
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (!@#$%^&*)" };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = hasArg("--dry-run");
  const registrationNo = getArg("--registration-no");
  const email = getArg("--email");
  const password = getArg("--password");
  const name = getArg("--name");

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  // Require one identifier
  if (!registrationNo && !email) {
    console.error("❌ Error: Provide either --registration-no or --email");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (registrationNo && email) {
    console.error("❌ Error: Provide ONLY ONE: --registration-no or --email");
    printUsage();
    process.exitCode = 1;
    return;
  }

  // Require password (unless dry-run)
  if (!dryRun && !password) {
    console.error("❌ Error: --password is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  // Validate password strength
  if (password && !dryRun) {
    const validation = validatePassword(password);
    if (!validation.valid) {
      console.error(`❌ Error: ${validation.error}`);
      process.exitCode = 1;
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW / DRY RUN
  // ─────────────────────────────────────────────────────────────────────────

  if (dryRun) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                           DRY RUN PREVIEW                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

This shows what would be created:

1. New User Account
   - Registration No: [provided via CLI or auto-generated from email]
   - Email: ${email || "[none]"}
   - Name: ${name || "[auto-generated]"}
   - Role: admin ✓
   - Status: ACTIVE ✓

2. Credential Account (login credentials)
   - Provider: credential (password-based)
   - Password: [hashed with scrypt]

3. Next Steps
   - User can login with:
     ${registrationNo ? `     Registration No: ${registrationNo}` : "     Email: " + email}
     Password: [password provided]
   - Access admin panel at: /admin
   - Upload graduates at: /admin/graduates

To create this admin user, run:
  node scripts/setup-admin.cjs ${registrationNo ? `--registration-no ${registrationNo}` : `--email ${email}`} --password "YourPassword123!"
    `);
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DATABASE SETUP
  // ─────────────────────────────────────────────────────────────────────────

  console.log("\n📝 Setting up database connection...");
  
  // Use DIRECT_URL if available (for Neon), otherwise fall back to DATABASE_URL
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL or DIRECT_URL not set in environment");
    process.exitCode = 1;
    return;
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Allow self-signed certs (Neon)
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // CHECK DUPLICATES
    // ─────────────────────────────────────────────────────────────────────────

    console.log("🔍 Checking for existing admins...");

    let existingUser = null;
    if (registrationNo) {
      existingUser = await prisma.user.findUnique({
        where: { registrationNo: registrationNo.trim().toUpperCase() },
      });
      if (existingUser) {
        console.error(`❌ Error: User with registration number "${registrationNo}" already exists`);
        process.exitCode = 1;
        return;
      }
    } else if (email) {
      existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        console.error(`❌ Error: User with email "${email}" already exists`);
        process.exitCode = 1;
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE ADMIN USER
    // ─────────────────────────────────────────────────────────────────────────

    console.log("🔐 Hashing password...");
    const passwordHash = await hashPassword(password);

    const regNo = registrationNo ? registrationNo.trim().toUpperCase() : `ADMIN/${email.split("@")[0].toUpperCase()}`;
    const displayName = name || (email ? email.split("@")[0] : registrationNo);

    console.log("👤 Creating admin user...");
    const adminUser = await prisma.user.create({
      data: {
        name: displayName,
        registrationNo: regNo,
        email: email ? email.toLowerCase() : null,
        emailVerified: email ? true : false,
        role: "admin",
        accountStatus: "ACTIVE",
        defaultPassword: false,
        accounts: {
          create: {
            providerId: "credential",
            accountId: regNo,
            password: passwordHash,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SUCCESS
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                        ✅ ADMIN CREATED SUCCESSFULLY                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Admin Details:
  ID:                ${adminUser.id}
  Name:              ${adminUser.name}
  Registration No:   ${adminUser.registrationNo}
  Email:             ${adminUser.email || "[not set]"}
  Role:              ${adminUser.role} ✓
  Status:            ${adminUser.accountStatus} ✓

Login Credentials:
  Username: ${registrationNo || email}
  Password: [as provided]

Next Steps:
  1. Share these credentials with the admin securely
  2. They can login at: /login
  3. They will be redirected to: /admin
  4. They can upload graduates at: /admin/graduates

To create more admins:
  node scripts/setup-admin.cjs --registration-no UG19/ADMIN/002 --password "SecurePassword123!"
    `);
  } catch (error) {
    console.error("\n❌ Error creating admin user:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
