#!/usr/bin/env tsx
/**
 * End-to-end test of activation, lockout, unlock, sign-in limits and the ID
 * card gate — against a Neon TEST branch, never production.
 *
 * It seeds synthetic graduates (registration numbers UG19/E2E/…), drives the
 * real HTTP endpoints of a dev server pointed at the same branch, and checks
 * the security log. It refuses to run if either connection string points at
 * the production compute.
 *
 *   1. Start the server on the test branch (see docs in the run notes).
 *   2. npx tsx scripts/e2e-activation.ts
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!existsSync(".env.test.local")) {
  console.error("\n  .env.test.local is missing — refusing to guess which database to use.\n");
  process.exit(2);
}
dotenv.config({ path: ".env.test.local", override: true });

const PRODUCTION_COMPUTE = "ep-crimson-haze";
for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const value = process.env[name];
  if (!value || new URL(value).hostname.includes(PRODUCTION_COMPUTE)) {
    console.error(`\n  ${name} is missing or points at production — refusing to run.\n`);
    process.exit(2);
  }
}

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ORIGIN = BASE;
const PREFIX = "UG19/E2E/";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

/**
 * fetch() reuses keep-alive sockets, and Node's server closes idle ones after
 * five seconds — longer than the pauses where this script runs the unlock
 * script. The next request then lands on a dead socket and fails with
 * ECONNRESET before reaching the server, so one retry is safe even for POST.
 */
async function fetchOnce(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    if (code === "ECONNRESET" || code === "UND_ERR_SOCKET") return fetch(url, init);
    throw error;
  }
}

async function call(path: string, init: { method?: string; body?: unknown; ip: string; cookie?: string }) {
  const response = await fetchOnce(`${BASE}${path}`, {
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "x-real-ip": init.ip,
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, json, cookie, retryAfter: response.headers.get("retry-after") };
}

async function main() {
  const { prisma } = await import("../lib/db");
  const { hashPassword, generateDefaultPassword } = await import("../lib/password");

  console.log(`\n  database: ${new URL(process.env.DIRECT_URL!).hostname}  (test branch)`);
  console.log(`  server:   ${BASE}\n`);

  // ── Seed ──────────────────────────────────────────────────────────────────
  await prisma.authEvent.deleteMany({ where: { OR: [{ identifier: { startsWith: PREFIX } }, { ip: { startsWith: "10.9." } }] } });
  await prisma.user.deleteMany({ where: { registrationNo: { startsWith: PREFIX } } });

  async function seed(n: string, opts: { status: "PENDING" | "ACTIVE"; cgpa: string | null; surname?: string; fullName: string; password?: string }) {
    const registrationNo = `${PREFIX}${n}`;
    const password = opts.password ?? generateDefaultPassword(registrationNo);
    const user = await prisma.user.create({
      data: {
        name: opts.fullName,
        registrationNo,
        email: opts.status === "ACTIVE" ? `e2e-${n}@example.invalid` : null,
        defaultPassword: opts.status === "PENDING",
        accountStatus: opts.status,
      },
    });
    await prisma.account.create({
      data: { accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) },
    });
    await prisma.graduate.create({
      data: { userId: user.id, registrationNo, fullName: opts.fullName, surname: opts.surname ?? null, cgpa: opts.cgpa, showInDirectory: false },
    });
    return { registrationNo, password };
  }

  const u1 = await seed("0001", { status: "PENDING", cgpa: "3.50", fullName: "TESTER ALPHA ONE" });
  const u2 = await seed("0002", { status: "PENDING", cgpa: null, surname: "Abdul-Kareem", fullName: "ABDUL-KAREEM BETA TWO" });
  const u3 = await seed("0003", { status: "ACTIVE", cgpa: "2.75", fullName: "TESTER GAMMA THREE", password: "E2E-Member-Pass-1" });
  const u4 = await seed("0004", { status: "ACTIVE", cgpa: "3.10", fullName: "TESTER DELTA FOUR", password: "E2E-Member-Pass-4" });
  const u5 = await seed("0005", { status: "PENDING", cgpa: "3.00", fullName: "TESTER EPSILON FIVE" });
  const u6 = await seed("0006", { status: "PENDING", cgpa: "3.00", fullName: "TESTER ZETA SIX" });
  const u7 = await seed("0007", { status: "PENDING", cgpa: "3.00", fullName: "TESTER ETA SEVEN" });

  const signIn = (u: { registrationNo: string }, password: string, ip: string) =>
    call("/api/auth/sign-in/registration", { body: { registrationNo: u.registrationNo, password, rememberMe: true }, ip });
  const verify = (token: string, answer: string, ip: string) =>
    call("/api/auth/activation/verify", { body: { activationToken: token, answer, rememberMe: true }, ip });

  // ── A. Default password opens no session ─────────────────────────────────
  console.log("  A. default password");
  const a = await signIn(u1, u1.password, "10.9.0.1");
  check("returns verification_required", a.status === 200 && a.json.status === "verification_required", `HTTP ${a.status}`);
  check("asks for CGPA when the record has one", a.json.method === "cgpa");
  check("sets no session cookie", !a.cookie.includes("session_token"));
  const token1 = String(a.json.activationToken ?? "");

  // ── B. Five wrong answers lock activation ────────────────────────────────
  console.log("\n  B. lockout");
  const wrong = ["3.49", "3.51", "abc", "3.0", "3.60"];
  for (const [i, answer] of wrong.entries()) {
    const r = await verify(token1, answer, "10.9.0.1");
    const expect = i < 4 ? 400 : 423;
    check(`wrong answer ${i + 1} → ${expect}`, r.status === expect, `HTTP ${r.status}, remaining ${r.json.remaining ?? "-"}`);
  }
  const lockedRight = await verify(token1, "3.5", "10.9.0.1");
  check("correct answer while locked → still 423", lockedRight.status === 423, `HTTP ${lockedRight.status}`);

  // ── C. Secretariat unlock, then a correct answer opens a session ──────────
  console.log("\n  C. unlock");
  const status = spawnSync("npx", ["tsx", "scripts/unlock-activation.ts", u1.registrationNo, "--status"], { encoding: "utf8", shell: true, env: process.env });
  check("unlock --status reports LOCKED", /LOCKED until/.test(status.stdout), status.stdout.match(/activation\s+(.*)/)?.[1]?.trim() ?? "");
  const unlock = spawnSync("npx", ["tsx", "scripts/unlock-activation.ts", u1.registrationNo, "--reason", '"e2e: identity checked"'], { encoding: "utf8", shell: true, env: process.env });
  check("unlock with --reason succeeds", /Unlocked/.test(unlock.stdout));
  const a2 = await signIn(u1, u1.password, "10.9.0.2"); // the first token has expired by now or may have
  const c = await verify(String(a2.json.activationToken ?? ""), "3,50", "10.9.0.2");
  check("correct CGPA after unlock (typed 3,50) → 200", c.status === 200, `HTTP ${c.status}`);
  check("…and opens a session", c.cookie.includes("session_token"));
  const cookie1 = c.cookie;

  // ── D. Card waits for ACTIVE, then issues ────────────────────────────────
  console.log("\n  D. ID card gate");
  const d1 = await call("/api/id-cards", { method: "GET", ip: "10.9.0.2", cookie: cookie1 });
  check("card refused before onboarding (NOT_ACTIVE)", d1.status === 403 && d1.json.code === "NOT_ACTIVE", `HTTP ${d1.status} ${d1.json.code ?? ""}`);
  const onboard = await call("/api/onboarding/complete", {
    ip: "10.9.0.2",
    cookie: cookie1,
    body: { currentPassword: u1.password, newPassword: "E2E-New-Pass-1", confirmPassword: "E2E-New-Pass-1", profile: { email: "e2e-0001@example.invalid" } },
  });
  check("onboarding completes", onboard.status >= 200 && onboard.status < 300, `HTTP ${onboard.status} ${onboard.json.error ?? ""}`);
  const d2 = await call("/api/id-cards", { method: "GET", ip: "10.9.0.2", cookie: cookie1 });
  check("card issued once ACTIVE and verified", d2.status === 200, `HTTP ${d2.status} ${d2.json.error ?? ""}`);

  // ── E. The new password signs in normally ────────────────────────────────
  console.log("\n  E. after activation");
  const e = await signIn(u1, "E2E-New-Pass-1", "10.9.0.3");
  check("new password → session, no verification step", e.status === 200 && e.json.status !== "verification_required" && e.cookie.includes("session_token"), `HTTP ${e.status}`);
  const eOld = await signIn(u1, u1.password, "10.9.0.3");
  check("old default password no longer works", eOld.status === 401, `HTTP ${eOld.status}`);

  // ── F. Surname fallback ──────────────────────────────────────────────────
  console.log("\n  F. surname fallback (record without CGPA)");
  const f = await signIn(u2, u2.password, "10.9.0.4");
  check("asks for surname", f.json.method === "surname");
  const fv = await verify(String(f.json.activationToken ?? ""), "abdul kareem", "10.9.0.4");
  check("'abdul kareem' matches 'Abdul-Kareem' → 200", fv.status === 200, `HTTP ${fv.status}`);

  // ── G. Existing member confirms once before the card ─────────────────────
  console.log("\n  G. existing member");
  const g = await signIn(u3, u3.password, "10.9.0.5");
  check("own password signs in directly", g.status === 200 && g.cookie.includes("session_token"), `HTTP ${g.status}`);
  const g1 = await call("/api/id-cards", { method: "GET", ip: "10.9.0.5", cookie: g.cookie });
  check("card asks for confirmation (VERIFICATION_REQUIRED)", g1.status === 403 && g1.json.code === "VERIFICATION_REQUIRED", `HTTP ${g1.status} ${g1.json.code ?? ""}`);
  const g2 = await call("/api/activation/confirm", { ip: "10.9.0.5", cookie: g.cookie, body: { answer: "2.70" } });
  check("wrong CGPA → 400", g2.status === 400, `HTTP ${g2.status}`);
  const g3 = await call("/api/activation/confirm", { ip: "10.9.0.5", cookie: g.cookie, body: { answer: "2.75" } });
  check("right CGPA → 200", g3.status === 200, `HTTP ${g3.status}`);
  const g4 = await call("/api/id-cards", { method: "GET", ip: "10.9.0.5", cookie: g.cookie });
  check("card issued after confirming", g4.status === 200, `HTTP ${g4.status}`);

  // ── H. Sign-in pause after five failed passwords ─────────────────────────
  console.log("\n  H. sign-in rate limit");
  for (let i = 1; i <= 5; i++) {
    const r = await signIn(u4, "wrong-password", "10.9.0.6");
    check(`failed password ${i} → 401`, r.status === 401, `HTTP ${r.status}`);
  }
  const h = await signIn(u4, u4.password, "10.9.0.6");
  check("6th attempt, even correct, → 429", h.status === 429, `HTTP ${h.status}`);
  check("…with Retry-After 900", h.retryAfter === "900", `Retry-After ${h.retryAfter}`);

  // ── I. Activation attempts per IP ────────────────────────────────────────
  console.log("\n  I. activation limit per IP (10 per hour)");
  const ip = "10.9.0.7";
  const tokens = await Promise.all([u5, u6, u7].map(async (u) => String((await signIn(u, u.password, ip)).json.activationToken ?? "")));
  const plan = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2]; // 4 + 4 + 2 wrong answers, none reaching a per-number lock
  for (const t of plan) await verify(tokens[t], "1.11", ip);
  const iBlocked = await verify(tokens[2], "3.00", ip);
  check("11th attempt from one IP → 429, even with the right answer", iBlocked.status === 429, `HTTP ${iBlocked.status}`);

  // ── J. Better Auth's own email sign-in is closed ─────────────────────────
  console.log("\n  J. side door");
  const j = await call("/api/auth/sign-in/email", { body: { email: "e2e-0003@example.invalid", password: u3.password }, ip: "10.9.0.8" });
  check("/sign-in/email → 403", j.status === 403, `HTTP ${j.status}`);

  // ── K. The security log ──────────────────────────────────────────────────
  console.log("\n  K. security log");
  const events = await prisma.authEvent.findMany({
    where: { OR: [{ identifier: { startsWith: PREFIX } }, { ip: { startsWith: "10.9." } }] },
  });
  const kinds = new Set(events.map((e) => e.kind));
  for (const kind of ["SIGN_IN_FAILED", "SIGN_IN_RATE_LIMITED", "ACTIVATION_REQUIRED", "ACTIVATION_FAILED", "ACTIVATION_LOCKED", "ACTIVATION_RATE_LIMITED", "ACTIVATION_SUCCEEDED", "ACTIVATION_UNLOCKED"]) {
    check(`logged ${kind}`, kinds.has(kind), `${events.filter((e) => e.kind === kind).length} rows`);
  }
  const secrets = ["3.49", "3.51", "3,50", "2.70", "2.75", "1.11", "abdul kareem", "Abdul-Kareem", "E2E-Member-Pass", "E2E-New-Pass", "wrong-password", u1.password];
  const leaks = events.filter((e) => secrets.some((s) => [e.reason, e.identifier, e.userAgent].some((v) => v?.toLowerCase().includes(s.toLowerCase()))));
  check("no password, CGPA or surname in any row", leaks.length === 0, `${events.length} rows scanned`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length} of ${results.length} checks passed.\n`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  // fetch() hides the real reason (refused, reset, timeout) in `cause`.
  const cause = error instanceof Error && error.cause ? `\n  cause: ${String((error.cause as Error).message ?? error.cause)}` : "";
  console.error(`\n  Failed: ${error instanceof Error ? error.stack : error}${cause}\n`);
  process.exit(1);
});
