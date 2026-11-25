#!/usr/bin/env tsx
/**
 * End-to-end test of reporting, blocking and the Secretariat's report queue —
 * against the TEST database, never production. Seeds synthetic members
 * (UG19/MOD/…) and a synthetic admin, drives the real HTTP endpoints of a dev
 * server pointed at the same database, then removes everything it created.
 *
 *   E2E_BASE_URL=http://localhost:3100 npx tsx scripts/e2e-moderation.ts
 */

import { existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!existsSync(".env.test.local")) {
  console.error("\n  .env.test.local is missing — refusing to guess which database to use.\n");
  process.exit(2);
}
dotenv.config({ path: ".env.test.local", override: true });
process.env.DIRECT_URL = process.env.DATABASE_URL;
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).hostname.includes("ep-crimson-haze")) {
  console.error("\n  DATABASE_URL is missing or points at production — refusing to run.\n");
  process.exit(2);
}

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const PREFIX = "UG19/MOD/";
const ADMIN_EMAIL = "e2e-moderation-admin@example.invalid";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function call(path: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "x-real-ip": init.ip ?? "10.8.0.1",
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const cookie = (response.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, json, cookie };
}

async function main() {
  const { prisma } = await import("../lib/db");
  const { hashPassword } = await import("../lib/password");

  console.log(`\n  database: ${new URL(process.env.DATABASE_URL!).hostname}  (test)`);
  console.log(`  server:   ${BASE}\n`);

  const cleanup = async () => {
    await prisma.user.deleteMany({ where: { OR: [{ registrationNo: { startsWith: PREFIX } }, { email: ADMIN_EMAIL }] } });
    await prisma.alumniGroup.deleteMany({ where: { slug: "e2e-moderation" } });
  };
  await cleanup();

  try {
    // ── Seed ────────────────────────────────────────────────────────────────
    const seed = async (n: string, name: string) => {
      const registrationNo = `${PREFIX}${n}`;
      const password = `E2E-Mod-Pass-${n}`;
      const user = await prisma.user.create({
        data: { name, registrationNo, email: `e2e-mod-${n}@example.invalid`, accountStatus: "ACTIVE", defaultPassword: false },
      });
      await prisma.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) } });
      const graduate = await prisma.graduate.create({
        data: {
          userId: user.id, registrationNo, fullName: name, cgpa: "3.00", departmentName: "E2E Moderation",
          activationVerifiedAt: new Date(), activationMethod: "cgpa", profileCompleted: true,
          showInDirectory: true, availableForMentorship: true,
        },
      });
      return { registrationNo, password, graduateId: graduate.id, userId: user.id };
    };
    const a = await seed("0001", "MOD TESTER ALICE");
    const b = await seed("0002", "MOD TESTER BOLA");
    const c = await seed("0003", "MOD TESTER CHIDI");

    const adminUser = await prisma.user.create({
      data: { name: "E2E MODERATION ADMIN", registrationNo: `${PREFIX}ADMIN`, email: ADMIN_EMAIL, role: "admin", accountStatus: "ACTIVE", defaultPassword: false },
    });
    await prisma.account.create({ data: { accountId: adminUser.id, providerId: "credential", userId: adminUser.id, password: await hashPassword("E2E-Mod-Admin-Pass") } });

    const group = await prisma.alumniGroup.create({ data: { name: "E2E moderation", slug: "e2e-moderation", isAuto: true } as never });
    await prisma.groupMember.createMany({ data: [a, b, c].map((m) => ({ groupId: group.id, graduateId: m.graduateId })) });
    const post = await prisma.groupPost.create({ data: { groupId: group.id, authorId: b.graduateId, content: "E2E post by Bola" } });
    const dm = await prisma.conversation.create({
      data: { isGroup: false, participants: { create: [{ graduateId: a.graduateId }, { graduateId: b.graduateId }] } },
    });
    const message = await prisma.message.create({ data: { conversationId: dm.id, senderId: b.graduateId, body: "E2E message from Bola" } });

    const signIn = async (m: { registrationNo: string; password: string }, ip: string) =>
      (await call("/api/auth/sign-in/registration", { body: { registrationNo: m.registrationNo, password: m.password, rememberMe: false }, ip })).cookie;
    const ca = await signIn(a, "10.8.0.1");
    const cb = await signIn(b, "10.8.0.2");
    const cc = await signIn(c, "10.8.0.3");
    const cadmin = (await call("/api/auth/sign-in/registration", { body: { registrationNo: ADMIN_EMAIL, password: "E2E-Mod-Admin-Pass", rememberMe: false }, ip: "10.8.0.9" })).cookie;
    check("all four signed in", [ca, cb, cc, cadmin].every((x) => x.includes("session_token")));

    // ── A. Reporting ────────────────────────────────────────────────────────
    console.log("\n  A. reporting");
    let r = await call("/api/reports", { cookie: ca, body: { targetType: "POST", targetId: post.id, reason: "SPAM", details: "e2e" } });
    check("report a post → 200", r.status === 200 && r.json.ok === true, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: ca, body: { targetType: "POST", targetId: post.id, reason: "SPAM" } });
    check("same report again → no-op", r.status === 200 && r.json.alreadyReported === true, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: cb, body: { targetType: "POST", targetId: post.id, reason: "SPAM" } });
    check("report your own post → 400", r.status === 400, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: cc, body: { targetType: "MESSAGE", targetId: message.id, reason: "HARASSMENT" } });
    check("report a message you were not in → 404", r.status === 404, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: ca, body: { targetType: "MESSAGE", targetId: message.id, reason: "HARASSMENT" } });
    check("report a message you received → 200", r.status === 200, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: cc, body: { targetType: "PROFILE", targetId: b.graduateId, reason: "IMPERSONATION" } });
    check("report a profile → 200", r.status === 200, `HTTP ${r.status}`);
    r = await call("/api/reports", { cookie: ca, body: { targetType: "POST", targetId: post.id } });
    check("report without a reason → 400", r.status === 400, `HTTP ${r.status}`);
    const stored = await prisma.contentReport.findMany({ where: { subjectId: b.graduateId } });
    check("3 reports stored, all against Bola", stored.length === 3);

    // ── B. Blocking ─────────────────────────────────────────────────────────
    console.log("\n  B. blocking");
    const sees = async (cookie: string, id: string) => {
      const d = await call(`/api/directory?q=MOD%20TESTER&pageSize=50&t=${Date.now()}`, { method: "GET", cookie });
      return ((d.json.items as { id: string }[]) ?? []).some((i) => i.id === id);
    };
    check("before: Alice sees Bola in the directory", await sees(ca, b.graduateId));
    r = await call("/api/blocks", { cookie: ca, body: { graduateId: b.graduateId } });
    check("Alice blocks Bola → 200", r.status === 200, `HTTP ${r.status}`);
    r = await call("/api/blocks", { cookie: ca, body: { graduateId: a.graduateId } });
    check("block yourself → 400", r.status === 400, `HTTP ${r.status}`);
    check("Alice no longer sees Bola in the directory", !(await sees(ca, b.graduateId)));
    check("Bola no longer sees Alice in the directory", !(await sees(cb, a.graduateId)));
    check("Chidi still sees both", (await sees(cc, a.graduateId)) && (await sees(cc, b.graduateId)));
    const finds = async (cookie: string, id: string) => {
      const d = await call(`/api/search?q=MOD%20TESTER`, { method: "GET", cookie });
      return ((d.json.alumni as { id: string }[]) ?? []).some((i) => i.id === id);
    };
    check("Alice no longer finds Bola in search", !(await finds(ca, b.graduateId)));
    check("Bola no longer finds Alice in search", !(await finds(cb, a.graduateId)));
    check("Chidi still finds both in search", (await finds(cc, a.graduateId)) && (await finds(cc, b.graduateId)));
    r = await call(`/api/directory/${a.graduateId}`, { method: "GET", cookie: cb });
    check("Bola opening Alice's profile → 404", r.status === 404, `HTTP ${r.status}`);
    r = await call(`/api/groups/${group.id}/posts`, { method: "GET", cookie: ca });
    const postIds = JSON.stringify(r.json);
    check("Bola's post hidden from Alice's group feed", r.status === 200 && !postIds.includes(post.id), `HTTP ${r.status}`);
    r = await call(`/api/groups/${group.id}/posts`, { method: "GET", cookie: cc });
    check("Bola's post still visible to Chidi", JSON.stringify(r.json).includes(post.id));
    r = await call(`/api/messages/conversations/${dm.id}`, { method: "GET", cookie: ca });
    check("Bola's message hidden in Alice's thread", r.status === 200 && !JSON.stringify(r.json).includes(message.id), `HTTP ${r.status}`);
    r = await call("/api/messages/direct", { cookie: ca, body: { graduateId: b.graduateId } });
    check("Alice → Bola new conversation → 403", r.status === 403, `HTTP ${r.status}`);
    r = await call(`/api/messages/conversations/${dm.id}/messages`, { cookie: cb, body: { body: "still there?" } });
    check("Bola → Alice in the old thread → 403", r.status === 403, `HTTP ${r.status}`);
    r = await call("/api/connections/request", { cookie: cb, body: { receiverGraduateId: a.graduateId } });
    check("Bola → Alice connection request → 403", r.status === 403, `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);
    r = await call("/api/blocks", { method: "GET", cookie: ca });
    check("Alice's blocked list shows Bola", JSON.stringify(r.json).includes(b.graduateId));
    r = await call(`/api/blocks?graduateId=${b.graduateId}`, { method: "DELETE", cookie: ca });
    check("Alice unblocks → 200", r.status === 200, `HTTP ${r.status}`);
    check("after unblocking, Alice sees Bola again", await sees(ca, b.graduateId));

    // ── C. Secretariat queue ────────────────────────────────────────────────
    console.log("\n  C. Secretariat queue");
    r = await call("/api/admin/reports", { method: "GET", cookie: ca });
    check("a member cannot read the queue", r.status === 401 || r.status === 403, `HTTP ${r.status}`);
    r = await call("/api/admin/reports", { method: "GET", cookie: cadmin });
    const items = (r.json.items as { id: string; targetType: string; targetId: string; preview: { text: string } | null; subject: { totalReports: number } | null }[]) ?? [];
    const ours = items.filter((i) => [post.id, message.id, b.graduateId].includes(i.targetId));
    check("admin sees the 3 open reports", r.status === 200 && ours.length === 3, `HTTP ${r.status}, ${ours.length}`);
    const postReport = ours.find((i) => i.targetType === "POST");
    check("post report carries a preview and Bola's report count", postReport?.preview?.text === "E2E post by Bola" && postReport?.subject?.totalReports === 3);
    r = await call("/api/admin/review-queue", { method: "GET", cookie: cadmin });
    check("review queue lists reports", JSON.stringify(r.json).includes('"key":"reports"'));

    r = await call(`/api/admin/reports/${postReport!.id}`, { method: "PATCH", cookie: cadmin, body: { action: "remove" } });
    check("remove the post → 200", r.status === 200, `HTTP ${r.status}`);
    check("post is now hidden", (await prisma.groupPost.findUnique({ where: { id: post.id } }))?.isDeleted === true);
    r = await call(`/api/groups/${group.id}/posts`, { method: "GET", cookie: cc });
    check("removed post gone from Chidi's feed", !JSON.stringify(r.json).includes(post.id));

    const profileReport = ours.find((i) => i.targetType === "PROFILE")!;
    r = await call(`/api/admin/reports/${profileReport.id}`, { method: "PATCH", cookie: cadmin, body: { action: "suspend", note: "e2e" } });
    check("suspend Bola → 200", r.status === 200, `HTTP ${r.status}`);
    const bola = await prisma.user.findUnique({ where: { id: b.userId }, select: { accountStatus: true, _count: { select: { sessions: true } } } });
    check("Bola is SUSPENDED and signed out everywhere", bola?.accountStatus === "SUSPENDED" && bola._count.sessions === 0);
    r = await call("/api/auth/sign-in/registration", { body: { registrationNo: b.registrationNo, password: b.password, rememberMe: false }, ip: "10.8.0.2" });
    check("Bola's sign-in now refused (403 ACCOUNT_SUSPENDED)", r.status === 403 && r.json.code === "ACCOUNT_SUSPENDED", `HTTP ${r.status} ${r.json.code ?? ""}`);
    r = await call("/api/auth/sign-in/registration", { body: { registrationNo: b.registrationNo, password: "wrong", rememberMe: false }, ip: "10.8.0.2" });
    check("wrong password for a suspended account still says 401", r.status === 401, `HTTP ${r.status}`);

    const messageReport = ours.find((i) => i.targetType === "MESSAGE")!;
    r = await call(`/api/admin/reports/${messageReport.id}`, { method: "PATCH", cookie: cadmin, body: { action: "dismiss" } });
    check("dismiss the message report → 200", r.status === 200);
    const statuses = await prisma.contentReport.findMany({ where: { subjectId: b.graduateId }, select: { targetType: true, status: true } });
    check(
      "statuses: post ACTIONED, profile ACTIONED, message DISMISSED",
      statuses.find((s) => s.targetType === "POST")?.status === "ACTIONED" &&
        statuses.find((s) => s.targetType === "PROFILE")?.status === "ACTIONED" &&
        statuses.find((s) => s.targetType === "MESSAGE")?.status === "DISMISSED"
    );
  } finally {
    await cleanup();
    console.log(`\n  cleanup done; ${pass} passed, ${fail} failed\n`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
