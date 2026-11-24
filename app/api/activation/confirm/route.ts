import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attemptVerification, clientIp } from "@/lib/activation";

/**
 * The one-off identity confirmation for members who activated before the
 * CGPA/surname check existed. Asked the next time they open their ID card;
 * on success it records the same activationVerifiedAt and activationMethod a
 * new activation does, so from then on they are indistinguishable.
 */
const bodySchema = z.object({ answer: z.string().max(80) });

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your answer to continue." }, { status: 400 });
  }

  const graduate = await prisma.graduate.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      registrationNo: true,
      fullName: true,
      surname: true,
      cgpa: true,
      activationVerifiedAt: true,
      user: { select: { accountStatus: true } },
    },
  });

  if (!graduate) {
    return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
  }
  if (graduate.user.accountStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Complete account activation first." }, { status: 403 });
  }
  if (graduate.activationVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const outcome = await attemptVerification({
    graduate,
    userId: session.user.id,
    answer: parsed.data.answer,
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.message, remaining: outcome.remaining ?? null },
      { status: outcome.status }
    );
  }
  return NextResponse.json({ ok: true, method: outcome.method });
}
