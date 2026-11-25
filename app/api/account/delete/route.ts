import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { clientIp, recordAuthEvent, signInBlockedBy } from "@/lib/activation";
import { deleteAccount } from "@/lib/account-deletion";

/**
 * Member-initiated account deletion (web and app). The password is asked
 * again so a borrowed, signed-in phone cannot delete someone's account; wrong
 * answers count against the same limit as failed sign-ins.
 */
const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, registrationNo: true, accounts: { where: { providerId: "credential" }, select: { password: true } } },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Administrator accounts are removed by the Secretariat, not from here." }, { status: 403 });
  }

  const identifier = user.registrationNo ?? user.id;
  const ip = clientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  if (await signInBlockedBy(identifier, ip)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }
  const hash = user.accounts[0]?.password;
  if (!hash || !(await verifyPassword(parsed.data.password, hash))) {
    await recordAuthEvent("SIGN_IN_FAILED", { identifier, userId: user.id, ip, userAgent, reason: "wrong password (account deletion)" });
    return NextResponse.json({ error: "That password is not correct." }, { status: 400 });
  }

  const result = await deleteAccount(user.id);
  await recordAuthEvent("ACCOUNT_DELETED", { identifier, ip, userAgent, reason: `member request; ${result.filesRemoved} files removed` });

  const response = NextResponse.json({ ok: true });
  // The session row is gone with the user. Clear every auth cookie too: the
  // 5-minute session cache cookie would otherwise still read as signed in.
  for (const { name } of request.cookies.getAll()) {
    if (/^(__Secure-)?better-auth\./.test(name)) response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return response;
}
