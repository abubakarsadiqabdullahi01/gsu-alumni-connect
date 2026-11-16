#!/usr/bin/env tsx
/**
 * Merges the alumni groups that the importer created from raw spreadsheet
 * values, before it learned to canonicalise them.
 *
 * One state was spelled a dozen ways — "AB", "ABI", "ABIA" — and each spelling
 * became its own group, so graduates from one state never met. Six department
 * groups carry a bare course code ("SLP Alumni") because the code was not in
 * the department map.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   pnpm tsx scripts/merge-duplicate-groups.ts
 *   pnpm tsx scripts/merge-duplicate-groups.ts --apply
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const APPLY = process.argv.includes("--apply");

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Group = {
  id: string;
  name: string;
  slug: string;
  stateCode: string | null;
  courseCode: string | null;
  _count: { members: number; posts: number };
};

/** One canonical group, and the duplicates that should fold into it. */
type Plan = {
  canonicalName: string;
  target: Group;
  sources: Group[];
  rename: boolean;
};

function planFor(groups: Group[], canonicalName: string): Plan | null {
  const wanted = canonicalName;
  // Prefer a group already carrying the right name; otherwise keep the one with
  // the most members, so the fewest memberships have to move.
  const target =
    groups.find((g) => g.name === wanted) ??
    [...groups].sort((a, b) => b._count.members - a._count.members)[0];
  if (!target) return null;

  const sources = groups.filter((g) => g.id !== target.id);
  const rename = target.name !== wanted;
  if (sources.length === 0 && !rename) return null;

  return { canonicalName: wanted, target, sources, rename };
}

async function main() {
  const { prisma } = await import("../lib/db");
  const { canonicalStateName } = await import("../lib/nigeria-state-centers");
  const { getDepartmentName } = await import("../lib/excel/department-map");

  const select = {
    id: true,
    name: true,
    slug: true,
    stateCode: true,
    courseCode: true,
    _count: { select: { members: true, posts: true } },
  } as const;

  const [stateGroups, deptGroups] = await Promise.all([
    prisma.alumniGroup.findMany({ where: { type: "STATE" }, select }),
    prisma.alumniGroup.findMany({ where: { type: "DEPARTMENT" }, select }),
  ]);

  const plans: Plan[] = [];
  const untouched: Group[] = [];

  // ── States ────────────────────────────────────────────────────────────────
  const byState = new Map<string, Group[]>();
  for (const group of stateGroups) {
    const raw = group.stateCode ?? group.name.replace(/ State Alumni$/, "");
    const canonical = canonicalStateName(raw);
    if (!canonical) {
      untouched.push(group); // unrecognised: leave it visible, as designed
      continue;
    }
    byState.set(canonical, [...(byState.get(canonical) ?? []), group]);
  }
  for (const [state, groups] of byState) {
    const plan = planFor(groups, `${state} State Alumni`);
    if (plan) plans.push(plan);
  }

  // ── Departments named with a bare course code ─────────────────────────────
  for (const group of deptGroups) {
    if (!group.courseCode || group.name !== `${group.courseCode} Alumni`) continue;
    const proper = getDepartmentName(group.courseCode);
    if (!proper || proper === group.courseCode) {
      untouched.push(group); // code is not in the department map
      continue;
    }
    const wanted = `${proper} Alumni`;
    const existing = deptGroups.filter((g) => g.name === wanted || g.id === group.id);
    const plan = planFor(existing, wanted);
    if (plan) plans.push(plan);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  let membersMoving = 0;
  let groupsDeleted = 0;

  console.log(`\n  ${APPLY ? "APPLYING" : "DRY RUN — nothing will be written"}\n`);
  for (const plan of plans) {
    const moving = plan.sources.reduce((n, g) => n + g._count.members, 0);
    const posts = plan.sources.reduce((n, g) => n + g._count.posts, 0);
    membersMoving += moving;
    groupsDeleted += plan.sources.length;

    console.log(`  ${plan.canonicalName}`);
    console.log(
      `    keep   ${plan.target.name} (${plan.target._count.members} members)` +
        (plan.rename ? `  -> rename to "${plan.canonicalName}"` : "")
    );
    for (const source of plan.sources) {
      console.log(`    merge  ${source.name} (${source._count.members} members, ${source._count.posts} posts)`);
    }
    if (posts) console.log(`    posts moving: ${posts}`);
  }

  console.log(`\n  ${plans.length} groups after merge, ${groupsDeleted} deleted, ${membersMoving} memberships moved`);
  console.log(`  left alone (unrecognised): ${untouched.length}`);
  for (const g of untouched.slice(0, 10)) console.log(`    ${g.name} (${g._count.members})`);

  if (!APPLY) {
    console.log(`\n  Re-run with --apply to perform it.\n`);
    await prisma.$disconnect();
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  // One transaction per source group, and the moving is done set-based in the
  // database. Reading every membership into this process and sending it back as
  // one enormous IN (...) blew the transaction budget on Gombe, which alone
  // holds about 15,700 memberships.
  for (const plan of plans) {
    for (const source of plan.sources) {
      await prisma.$transaction(
        async (tx) => {
          // [groupId, graduateId] is unique, so anyone already in the target
          // keeps their original membership and the duplicate row goes.
          await tx.$executeRaw`
            DELETE FROM "group_member" AS dup
            WHERE dup."group_id" = ${source.id}
              AND EXISTS (
                SELECT 1 FROM "group_member" AS kept
                WHERE kept."group_id" = ${plan.target.id}
                  AND kept."graduate_id" = dup."graduate_id"
              )`;

          await tx.$executeRaw`
            UPDATE "group_member" SET "group_id" = ${plan.target.id}
            WHERE "group_id" = ${source.id}`;

          await tx.$executeRaw`
            UPDATE "group_post" SET "group_id" = ${plan.target.id}
            WHERE "group_id" = ${source.id}`;

          await tx.$executeRaw`
            DELETE FROM "alumni_group" WHERE "id" = ${source.id}`;
        },
        { timeout: 30_000, maxWait: 10_000 }
      );

      console.log(`    moved ${source.name} -> ${plan.canonicalName}`);
    }

    if (plan.rename) {
      await prisma.alumniGroup.update({
        where: { id: plan.target.id },
        data: { name: plan.canonicalName, slug: slugify(plan.canonicalName) },
      });
    }

    console.log(`  merged: ${plan.canonicalName}`);
  }

  console.log(`\n  Done.\n`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(`\n  Failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
