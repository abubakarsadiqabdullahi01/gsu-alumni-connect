import { prisma } from "@/lib/db";

/**
 * Blocks work both ways for visibility: once either member blocks the other,
 * neither sees the other's posts, messages or profile, and neither can
 * message or connect with the other. Only the blocker can lift it (Settings >
 * Blocked members).
 */
export async function blockedIds(graduateId: string): Promise<string[]> {
  const rows = await prisma.memberBlock.findMany({
    where: { OR: [{ blockerId: graduateId }, { blockedId: graduateId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === graduateId ? r.blockedId : r.blockerId)))];
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const hit = await prisma.memberBlock.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { blockerId: true },
  });
  return hit !== null;
}

export const BLOCKED_MESSAGE = "You can't contact this member.";
