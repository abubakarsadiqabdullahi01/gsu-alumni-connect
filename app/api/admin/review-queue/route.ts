import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isSessionOk } from "@/lib/api-middleware";
import { prisma } from "@/lib/db";

/**
 * One place for everything waiting on an admin decision.
 *
 * Read-only and additive: it reads the queues that already exist rather than
 * introducing its own state, so it can ship without a migration and cannot
 * disagree with the per-module admin screens.
 *
 * Two items from the original brief are absent because the schema has nowhere
 * to put them yet — reported posts and flagged accounts both need a Report
 * model. See the `unavailable` array in the response.
 */
const PREVIEW_LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request.headers, "AdminReviewQueueAPI");
    if (!isSessionOk(result)) return result.error;

    const [
      pendingAchievements,
      pendingAchievementCount,
      unverifiedJobs,
      unverifiedJobCount,
      pendingMentorships,
      pendingMentorshipCount,
      pendingAccounts,
      pendingAccountCount,
      failedImports,
      failedImportCount,
    ] = await Promise.all([
      prisma.achievement.findMany({
        where: { verified: false },
        orderBy: { createdAt: "asc" },
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          title: true,
          year: true,
          createdAt: true,
          graduate: { select: { id: true, fullName: true, registrationNo: true } },
        },
      }),
      prisma.achievement.count({ where: { verified: false } }),

      prisma.jobPosting.findMany({
        where: { isVerified: false, isActive: true },
        orderBy: { createdAt: "asc" },
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          title: true,
          companyName: true,
          createdAt: true,
          postedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.jobPosting.count({ where: { isVerified: false, isActive: true } }),

      prisma.mentorship.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          subject: true,
          createdAt: true,
          mentee: { select: { id: true, fullName: true } },
          mentor: { select: { id: true, fullName: true } },
        },
      }),
      prisma.mentorship.count({ where: { status: "PENDING" } }),

      prisma.user.findMany({
        where: { accountStatus: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: PREVIEW_LIMIT,
        select: { id: true, name: true, registrationNo: true, createdAt: true },
      }),
      prisma.user.count({ where: { accountStatus: "PENDING" } }),

      prisma.importJob.findMany({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          status: true,
          totalRows: true,
          createdAt: true,
          _count: { select: { errors: true } },
        },
      }),
      prisma.importJob.count({ where: { status: "FAILED" } }),
    ]);

    const sections = [
      {
        key: "achievements",
        label: "Achievements awaiting verification",
        count: pendingAchievementCount,
        href: "/admin/achievements",
        items: pendingAchievements.map((row) => ({
          id: row.id,
          primary: row.title,
          secondary: `${row.graduate.fullName} · ${row.graduate.registrationNo}`,
          year: row.year,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      {
        key: "jobs",
        label: "Job posts awaiting verification",
        count: unverifiedJobCount,
        href: "/admin/jobs",
        items: unverifiedJobs.map((row) => ({
          id: row.id,
          primary: row.title,
          secondary: `${row.companyName} · posted by ${row.postedBy.fullName}`,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      {
        key: "mentorship",
        label: "Mentorship requests pending",
        count: pendingMentorshipCount,
        href: "/admin/mentorship",
        items: pendingMentorships.map((row) => ({
          id: row.id,
          primary: row.subject ?? "Mentorship request",
          secondary: `${row.mentee.fullName} → ${row.mentor.fullName}`,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      {
        key: "accounts",
        label: "Accounts pending activation",
        count: pendingAccountCount,
        href: "/admin/users",
        items: pendingAccounts.map((row) => ({
          id: row.id,
          primary: row.name,
          secondary: row.registrationNo,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      {
        key: "imports",
        label: "Imports needing attention",
        count: failedImportCount,
        href: "/admin/import",
        items: failedImports.map((row) => ({
          id: row.id,
          primary: `Import of ${row.totalRows.toLocaleString()} rows`,
          secondary: `${row._count.errors.toLocaleString()} row error(s)`,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    ];

    return NextResponse.json({
      totalOutstanding: sections.reduce((sum, section) => sum + section.count, 0),
      sections,
      // Named explicitly so the admin UI can say "not built yet" rather than
      // silently implying there is nothing to moderate.
      unavailable: [
        { key: "reportedPosts", reason: "Needs a Report model; no moderation reports are stored yet." },
        { key: "flaggedAccounts", reason: "Needs a Report model; no abuse signals are stored yet." },
      ],
    });
  } catch (error) {
    console.error("[AdminReviewQueueAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load review queue." },
      { status: 500 }
    );
  }
}
