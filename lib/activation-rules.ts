import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The second check on activation.
 *
 * Every imported account's default password is derived from its registration
 * number, and the Association has chosen to keep that formula published. On
 * its own it would let anyone who can guess a registration number claim that
 * graduate's account. So a correct default password no longer opens a
 * session: the graduate must also give something the university record holds
 * and the registration number does not reveal — their CGPA, or, where the
 * record has none, their surname.
 */

export type VerificationMethod = "cgpa" | "surname";

export const LIMITS = {
  /** Failed sign-ins per registration number (or email) before a pause. */
  signInFailuresPerIdentifier: 5,
  /** Failed sign-ins per IP. High on purpose: carriers and campus Wi-Fi share addresses. */
  signInFailuresPerIp: 30,
  signInWindowSeconds: 15 * 60,
  /** Wrong CGPA/surname answers per registration number before activation locks. */
  activationFailuresPerIdentifier: 5,
  activationLockSeconds: 24 * 60 * 60,
  /** Activation attempts of any outcome per IP — a real graduate needs one or two. */
  activationAttemptsPerIp: 10,
  activationIpWindowSeconds: 60 * 60,
  activationTokenSeconds: 10 * 60,
} as const;

// ── Matching ────────────────────────────────────────────────────────────────

/**
 * True when `input` is the stored CGPA, allowing for how people type it:
 * "3.5", "3.50", " 3.50 ", "3,50" and "3.500" all match 3.50. A third
 * significant decimal is refused rather than rounded, so 3.499 never matches
 * 3.50.
 */
export function cgpaMatches(input: string, stored: { toString(): string } | null | undefined): boolean {
  if (stored == null) return false;
  const cleaned = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2}0*)?$/.test(cleaned)) return false;
  const given = Math.round(Number(cleaned) * 100);
  const expected = Math.round(Number(stored.toString()) * 100);
  return Number.isFinite(given) && Number.isFinite(expected) && given === expected;
}

/** Case, spaces, hyphens, apostrophes and accents are not what makes a name. */
function normaliseName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s\-'‘’`]/g, "");
}

/**
 * The surname as the university recorded it. 6,850 of the 6,891 records
 * without a CGPA carry it in its own column; for the rest, the graduation
 * sheets write the surname first in the full name.
 */
export function recordedSurname(graduate: { surname: string | null; fullName: string }): string {
  return graduate.surname?.trim() || graduate.fullName.trim().split(/\s+/)[0] || "";
}

export function surnameMatches(input: string, graduate: { surname: string | null; fullName: string }): boolean {
  const given = normaliseName(input);
  const expected = normaliseName(recordedSurname(graduate));
  return given.length > 0 && given === expected;
}

export function methodFor(graduate: { cgpa: unknown }): VerificationMethod {
  return graduate.cgpa != null ? "cgpa" : "surname";
}

// ── Activation token ────────────────────────────────────────────────────────
// Carries a correct default-password sign-in across to the verification step
// without issuing a session in between. Short-lived and bound to one user.

function signingSecret(): string {
  return process.env.BETTER_AUTH_SECRET ?? "";
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(`activation:${body}`).digest("base64url");
}

export function signActivationToken(userId: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + LIMITS.activationTokenSeconds;
  const body = `${userId}.${expires}`;
  return `${Buffer.from(body).toString("base64url")}.${sign(body)}`;
}

/** The user the token was issued for, or null when forged, altered or expired. */
export function verifyActivationToken(token: string, now = Date.now()): string | null {
  if (!signingSecret() || typeof token !== "string") return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const body = Buffer.from(encoded, "base64url").toString();
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const [userId, expires] = body.split(".");
  if (!userId || !Number.isFinite(Number(expires))) return null;
  if (Math.floor(now / 1000) > Number(expires)) return null;
  return userId;
}

// ── Request context ─────────────────────────────────────────────────────────

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** What the person is asked for, in words they will recognise. */
export function promptFor(method: VerificationMethod): string {
  return method === "cgpa"
    ? "Enter your CGPA exactly as it appears on your result (for example 3.45)."
    : "Enter your surname exactly as it appears on your university record.";
}
