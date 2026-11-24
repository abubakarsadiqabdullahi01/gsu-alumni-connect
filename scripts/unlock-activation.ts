#!/usr/bin/env tsx
/**
 * Lifts an activation lock for one registration number.
 *
 * Five wrong CGPA or surname answers lock activation for 24 hours. When the
 * graduate is genuine — a surname spelled differently on the record, a CGPA
 * remembered wrongly — the Secretariat confirms who they are by its own
 * means, then runs this. It clears the lock and the sign-in pause, and records
 * who it was for and why in the security log.
 *
 *   npx tsx scripts/unlock-activation.ts UG19/SCCS/1073 --reason "ID checked in person"
 *   npx tsx scripts/unlock-activation.ts UG19/SCCS/1073 --status
 *
 * It never prints the CGPA or surname on record — the Secretariat checks those
 * in the university's own records, not here.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const USAGE = `
  Usage:
    npx tsx scripts/unlock-activation.ts <registration number> --reason "<why>"
    npx tsx scripts/unlock-activation.ts <registration number> --status

  --reason   Required to unlock. Recorded in the security log.
  --status   Show the lock without changing anything.
`;

async function main() {
  const raw = process.argv[2];
  if (!raw || raw.startsWith("--")) {
    console.log(USAGE);
    process.exit(1);
  }

  const { prisma } = await import("../lib/db");
  const { normalizeRegistrationNo } = await import("../lib/auth-identity");
  const { activationFailKey, recordAuthEvent, LIMITS } = await import("../lib/activation");
  const { redisDel, redisGetCount, redisTtl } = await import("../lib/cache/redis-cache");

  const registrationNo = normalizeRegistrationNo(raw);
  const user = await prisma.user.findUnique({
    where: { registrationNo },
    select: { id: true, name: true, accountStatus: true, defaultPassword: true },
  });

  if (!user) {
    console.log(`\n  No account with registration number ${registrationNo}.\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const failKey = activationFailKey(registrationNo);
  const signInKey = `auth:signin:fail:id:${registrationNo}`;
  const [failures, ttl, signInFailures] = await Promise.all([
    redisGetCount(failKey),
    redisTtl(failKey),
    redisGetCount(signInKey),
  ]);

  if (failures == null) {
    console.log("\n  Redis is unreachable — cannot read or clear the lock. Check IMPORT_QUEUE_REDIS_URL.\n");
    await prisma.$disconnect();
    process.exit(1);
  }

  const locked = failures >= LIMITS.activationFailuresPerIdentifier;
  console.log(`
  ${user.name}  (${registrationNo})
  account            ${user.accountStatus}${user.defaultPassword ? ", default password" : ""}
  activation         ${locked ? "LOCKED" : "not locked"} — ${failures} wrong answer${failures === 1 ? "" : "s"}${ttl ? `, clears itself in ${Math.ceil(ttl / 3600)}h` : ""}
  sign-in failures   ${signInFailures ?? "?"} in the current 15-minute window
`);

  if (process.argv.includes("--status")) {
    await prisma.$disconnect();
    return;
  }

  const reason = arg("reason")?.trim();
  if (!reason) {
    console.log("  Nothing changed: --reason is required to unlock.\n");
    await prisma.$disconnect();
    process.exit(1);
  }

  await redisDel(failKey, signInKey);
  await recordAuthEvent("ACTIVATION_UNLOCKED", {
    identifier: registrationNo,
    userId: user.id,
    ip: "secretariat-script",
    reason,
  });

  console.log("  Unlocked. The graduate can try again now; it is in the security log.\n");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(`\n  Failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
