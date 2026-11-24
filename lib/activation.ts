import { prisma } from "@/lib/db";
import { redisDel, redisGetCount, redisIncrWindow, redisTtl } from "@/lib/cache/redis-cache";
import { LIMITS, cgpaMatches, methodFor, surnameMatches, type VerificationMethod } from "@/lib/activation-rules";

/**
 * The stateful half of the activation check: the security log, the Redis
 * counters behind the limits, and the attempt that ties them together. The
 * rules themselves — matching, the token, the limits — live in
 * activation-rules.ts, free of the database, so they can be tested on their own.
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
  | "ACTIVATION_UNLOCKED";

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

// ── Sign-in limits (fail open) ──────────────────────────────────────────────
// If Redis is unreachable, sign-in carries on: an outage must not lock every
// member out, and the activation check behind it still fails closed.

const signInIdKey = (identifier: string) => `auth:signin:fail:id:${identifier}`;
const signInIpKey = (ip: string) => `auth:signin:fail:ip:${ip}`;

export async function signInBlockedBy(identifier: string, ip: string): Promise<"identifier" | "ip" | null> {
  const [byId, byIp] = await Promise.all([redisGetCount(signInIdKey(identifier)), redisGetCount(signInIpKey(ip))]);
  if (byId == null || byIp == null) {
    console.warn("[auth] sign-in limiter unavailable; allowing the attempt");
    return null;
  }
  if (byId >= LIMITS.signInFailuresPerIdentifier) return "identifier";
  if (byIp >= LIMITS.signInFailuresPerIp) return "ip";
  return null;
}

export async function recordSignInFailure(identifier: string, ip: string): Promise<void> {
  await Promise.all([
    redisIncrWindow(signInIdKey(identifier), LIMITS.signInWindowSeconds),
    redisIncrWindow(signInIpKey(ip), LIMITS.signInWindowSeconds),
  ]);
}

export async function clearSignInFailures(identifier: string): Promise<void> {
  await redisDel(signInIdKey(identifier));
}

// ── Activation check (fail closed) ──────────────────────────────────────────

export const activationFailKey = (registrationNo: string) => `auth:activation:fail:${registrationNo}`;
const activationIpKey = (ip: string) => `auth:activation:ip:${ip}`;

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

  const attemptsFromIp = await redisIncrWindow(activationIpKey(ip), LIMITS.activationIpWindowSeconds);
  if (attemptsFromIp == null) {
    return { ok: false, status: 503, message: "Activation is briefly unavailable. Please try again shortly." };
  }
  if (attemptsFromIp > LIMITS.activationAttemptsPerIp) {
    await recordAuthEvent("ACTIVATION_RATE_LIMITED", { ...log, reason: `ip attempts ${attemptsFromIp}` });
    return { ok: false, status: 429, message: "Too many activation attempts from this network. Please try again later." };
  }

  const failures = await redisGetCount(activationFailKey(identifier));
  if (failures == null) {
    return { ok: false, status: 503, message: "Activation is briefly unavailable. Please try again shortly." };
  }
  if (failures >= LIMITS.activationFailuresPerIdentifier) {
    const ttl = await redisTtl(activationFailKey(identifier));
    await recordAuthEvent("ACTIVATION_LOCKED", { ...log, reason: `locked; ${ttl ?? "?"}s remaining` });
    return {
      ok: false,
      status: 423,
      message: "Too many attempts. Activation is locked for this registration number — contact the Alumni Secretariat at alumni@gsu.edu.ng.",
    };
  }

  const answer = input.answer ?? "";
  const correct = method === "cgpa" ? cgpaMatches(answer, graduate.cgpa) : surnameMatches(answer, graduate);

  if (!correct) {
    const count = (await redisIncrWindow(activationFailKey(identifier), LIMITS.activationLockSeconds)) ?? failures + 1;
    const remaining = Math.max(0, LIMITS.activationFailuresPerIdentifier - count);
    await recordAuthEvent("ACTIVATION_FAILED", { ...log, reason: `${method} mismatch; attempt ${count} of ${LIMITS.activationFailuresPerIdentifier}` });
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

  await redisDel(activationFailKey(identifier));
  await prisma.graduate.update({
    where: { id: graduate.id },
    data: { activationVerifiedAt: new Date(), activationMethod: method },
  });
  await recordAuthEvent("ACTIVATION_SUCCEEDED", { ...log, reason: method });
  return { ok: true, method };
}
