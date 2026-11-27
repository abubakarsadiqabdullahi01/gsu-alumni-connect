import { prisma } from "@/lib/db";
import { LIMITS, cgpaMatches, methodFor, surnameMatches, type VerificationMethod } from "@/lib/activation-rules";

/**
 * The stateful half of the activation check: the security log, the limits
 * counted from it, and the attempt that ties them together. The rules
 * themselves — matching, the token, the limits — live in activation-rules.ts,
 * free of the database, so they can be tested on their own.
 *
 * The log is the counter. "Five wrong answers in 24 hours" is a count of
 * ACTIVATION_FAILED rows; an unlock is an ACTIVATION_UNLOCKED row the count
 * starts after. One source of truth, auditable after the fact, and no second
 * system for the security gate to depend on — the Redis database these
 * counters were first written against had been deleted for inactivity.
 */
export * from "@/lib/activation-rules";

// ── Security log ────────────────────────────────────────────────────────────

export type AuthEventKind =
  | "SIGN_IN_FAILED"
  | "SIGN_IN_RATE_LIMITED"
  | "ACTIVATION_REQUIRED"
  | "ACTIVATION_FAILED"
  | "ACTIVATION_LOCKED"
  | "ACTIVATION_RATE_LIMITED"
  | "ACTIVATION_SUCCEEDED"
  | "ACTIVATION_UNLOCKED"
  | "ACCOUNT_DELETED";

/**
 * Never throws: a failure to write the log must not become a failure to sign
 * in. Callers pass reasons, never the password or the answer that was typed.
 */
export async function recordAuthEvent(
  kind: AuthEventKind,
  event: { identifier?: string | null; userId?: string | null; ip?: string | null; userAgent?: string | null; reason?: string | null }
): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        kind,
        identifier: event.identifier ?? null,
        userId: event.userId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent?.slice(0, 400) ?? null,
        reason: event.reason ?? null,
      },
    });
  } catch (error) {
    console.error("[auth-event] could not record", kind, error);
  }
}

const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

// ── Sign-in limits (fail open) ──────────────────────────────────────────────
// Each failed sign-in is already an auth_event row, so recording a failure is
// recording the event. If the count can't be read, sign-in carries on: an
// outage must not lock every member out, and the activation check behind it
// still fails closed. A success does not reset the count — at worst a member
// who has just signed in waits out the rest of a 15-minute window.
//
// The attempt is written before the count is read. Counting first let a burst
// of parallel guesses all read the same low count; now the k-th attempt to be
// written always counts at least k, so no more than the limit reach the
// password check, and there is no lock for sign-ins from a shared carrier IP
// to queue on. The row starts as a failure and the caller settles it: `fail`
// keeps it with its reason, `pass` deletes it. A request that dies in between
// leaves a failure behind, which errs on the safe side.

export type SignInAttempt = {
  blockedBy: "identifier" | "ip" | null;
  fail: (reason: string, userId?: string) => Promise<void>;
  pass: () => Promise<void>;
};

export async function startSignInAttempt(event: { identifier: string; ip: string; userAgent: string | null }): Promise<SignInAttempt> {
  const { identifier, ip, userAgent } = event;
  const since = secondsAgo(LIMITS.signInWindowSeconds);
  const logError = (error: unknown) => console.error("[auth-event] could not settle sign-in attempt", error);
  let id: string | null = null;
  let blockedBy: SignInAttempt["blockedBy"] = null;
  try {
    ({ id } = await prisma.authEvent.create({
      data: { kind: "SIGN_IN_FAILED", identifier, ip, userAgent: userAgent?.slice(0, 400) ?? null, reason: "in progress" },
      select: { id: true },
    }));
    const [byId, byIp] = await Promise.all([
      prisma.authEvent.count({ where: { kind: "SIGN_IN_FAILED", identifier, createdAt: { gt: since } } }),
      prisma.authEvent.count({ where: { kind: "SIGN_IN_FAILED", ip, createdAt: { gt: since } } }),
    ]);
    // Both counts include this attempt, hence ">" where counting first used ">=".
    if (byId > LIMITS.signInFailuresPerIdentifier) blockedBy = "identifier";
    else if (byIp > LIMITS.signInFailuresPerIp) blockedBy = "ip";
  } catch (error) {
    console.warn("[auth] sign-in limiter unavailable; allowing the attempt", error);
  }
  if (blockedBy && id) {
    await prisma.authEvent.update({ where: { id }, data: { kind: "SIGN_IN_RATE_LIMITED", reason: `by ${blockedBy}` } }).catch(logError);
  }

  return {
    blockedBy,
    fail: async (reason, userId) => {
      if (!id) return recordAuthEvent("SIGN_IN_FAILED", { identifier, userId, ip, userAgent, reason });
      await prisma.authEvent.update({ where: { id }, data: { reason, userId } }).catch(logError);
    },
    pass: async () => {
      if (id) await prisma.authEvent.delete({ where: { id } }).catch(logError);
    },
  };
}

// ── Activation lock (fail closed) ───────────────────────────────────────────

/**
 * Wrong answers that still count against this registration number: within
 * the last 24 hours, and after its most recent success or Secretariat unlock.
 * The lock lifts when the count drops below five — when enough of the counted
 * failures age past 24 hours.
 */
export async function activationLockState(registrationNo: string, db: Pick<typeof prisma, "authEvent"> = prisma): Promise<{ failures: number; lockedUntil: Date | null }> {
  const reset = await db.authEvent.findFirst({
    where: { identifier: registrationNo, kind: { in: ["ACTIVATION_SUCCEEDED", "ACTIVATION_UNLOCKED"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const windowStart = secondsAgo(LIMITS.activationLockSeconds);
  const since = reset && reset.createdAt > windowStart ? reset.createdAt : windowStart;

  const failures = await db.authEvent.findMany({
    where: { identifier: registrationNo, kind: "ACTIVATION_FAILED", createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const limit = LIMITS.activationFailuresPerIdentifier;
  if (failures.length < limit) return { failures: failures.length, lockedUntil: null };
  // Unlocks once only limit-1 failures remain inside the window.
  const pivot = failures[failures.length - limit].createdAt;
  return { failures: failures.length, lockedUntil: new Date(pivot.getTime() + LIMITS.activationLockSeconds * 1000) };
}

export type VerificationOutcome =
  | { ok: true; method: VerificationMethod }
  | { ok: false; status: 400 | 423 | 429 | 503; message: string; remaining?: number };

type VerifiableGraduate = {
  id: string;
  registrationNo: string;
  fullName: string;
  surname: string | null;
  cgpa: { toString(): string } | null;
};

const UNAVAILABLE: VerificationOutcome = {
  ok: false,
  status: 503,
  message: "Activation is briefly unavailable. Please try again shortly.",
};

/**
 * One attempt at the second check, shared by first activation and by the
 * one-off confirmation existing members make before their ID card is issued.
 * Records the outcome in the security log either way.
 */
export async function attemptVerification(input: {
  graduate: VerifiableGraduate;
  userId: string;
  answer: string;
  ip: string;
  userAgent: string | null;
}): Promise<VerificationOutcome> {
  const { graduate, userId, ip, userAgent } = input;
  const identifier = graduate.registrationNo;
  const method = methodFor(graduate);
  const log = { identifier, userId, ip, userAgent };
  const limit = LIMITS.activationFailuresPerIdentifier;

  try {
    return await prisma.$transaction(async (tx): Promise<VerificationOutcome> => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1, hashtext(${identifier}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2, hashtext(${ip}))`;
      const logOutcome = (kind: AuthEventKind, reason: string) =>
        tx.authEvent.create({ data: { ...log, userAgent: userAgent?.slice(0, 400), kind, reason, createdAt: new Date() } });
      const [attemptsFromIp, lock] = await Promise.all([
        tx.authEvent.count({
          where: {
            ip,
            kind: { in: ["ACTIVATION_FAILED", "ACTIVATION_SUCCEEDED"] },
            createdAt: { gt: secondsAgo(LIMITS.activationIpWindowSeconds) },
          },
        }),
        activationLockState(identifier, tx),
      ]);

      if (attemptsFromIp >= LIMITS.activationAttemptsPerIp) {
        await logOutcome("ACTIVATION_RATE_LIMITED", `${attemptsFromIp} attempts from this ip in the last hour`);
        return { ok: false, status: 429, message: "Too many activation attempts from this network. Please try again later." };
      }

      if (lock.lockedUntil) {
        await logOutcome("ACTIVATION_LOCKED", `locked until ${lock.lockedUntil.toISOString()}`);
        return {
          ok: false,
          status: 423,
          message: "Too many attempts. Activation is locked for this registration number — contact the Alumni Secretariat at alumni@gsu.edu.ng.",
        };
      }

      const answer = input.answer ?? "";
      const correct = method === "cgpa" ? cgpaMatches(answer, graduate.cgpa) : surnameMatches(answer, graduate);

      if (!correct) {
        const count = lock.failures + 1;
        const remaining = Math.max(0, limit - count);
        await logOutcome("ACTIVATION_FAILED", `${method} mismatch; attempt ${count} of ${limit}`);
        return {
          ok: false,
          status: remaining === 0 ? 423 : 400,
          remaining,
          message:
            remaining === 0
              ? "That doesn't match the university record, and activation is now locked for this registration number. Contact the Alumni Secretariat at alumni@gsu.edu.ng."
              : `That doesn't match the university record. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
        };
      }

      await tx.graduate.update({
        where: { id: graduate.id },
        data: { activationVerifiedAt: new Date(), activationMethod: method },
      });
      // Also resets the wrong-answer count: it starts after this row.
      await logOutcome("ACTIVATION_SUCCEEDED", method);
      return { ok: true, method };
    }, { isolationLevel: "ReadCommitted" });
  } catch (error) {
    console.error("[auth] activation transaction failed", error);
    return UNAVAILABLE;
  }
}
