import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** The signed-in member's blocks: list (GET), block (POST), unblock (DELETE ?graduateId=). */
async function me(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.graduate.findUnique({ where: { userId: session.user.id }, select: { id: true } });
}

export async function GET(request: NextRequest) {
  const graduate = await me(request);
  if (!graduate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.memberBlock.findMany({
    where: { blockerId: graduate.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, blocked: { select: { id: true, fullName: true, departmentName: true, graduationYear: true } } },
  });
  return NextResponse.json({
    items: rows.map((r) => ({ ...r.blocked, blockedAt: r.createdAt.toISOString() })),
  });
}

const bodySchema = z.object({ graduateId: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  const graduate = await me(request);
  if (!graduate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Member is required." }, { status: 400 });
  const { graduateId } = parsed.data;
  if (graduateId === graduate.id) return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });
  if (!(await prisma.graduate.findUnique({ where: { id: graduateId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  await prisma.memberBlock.upsert({
    where: { blockerId_blockedId: { blockerId: graduate.id, blockedId: graduateId } },
    create: { blockerId: graduate.id, blockedId: graduateId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const graduate = await me(request);
  if (!graduate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const graduateId = request.nextUrl.searchParams.get("graduateId")?.trim();
  if (!graduateId) return NextResponse.json({ error: "Member is required." }, { status: 400 });
  await prisma.memberBlock.deleteMany({ where: { blockerId: graduate.id, blockedId: graduateId } });
  return NextResponse.json({ ok: true });
}
