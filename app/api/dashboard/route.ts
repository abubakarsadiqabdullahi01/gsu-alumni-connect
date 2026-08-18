import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfileCompletion } from "@/lib/profile/completion";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

/**
 * Graduate dashboard data for the Android client.
 *
 * The web dashboard renders this on the server; mobile needs the same numbers as
 * JSON, plus pre-aggregated series so charts do not require client-side joins.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graduate = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        fullName: true,
        registrationNo: true,
        departmentName: true,
        facultyName: true,
        graduationYear: true,
        profileViews: true,
        profileCompleted: true,
        // Completion inputs (bio, contact, counts) are no longer selected here:
        // lib/profile/completion owns them now.
        user: { select: { image: true } },
        _count: {
          select: {
            groupMemberships: true,
            jobApplications: true,
            achievements: true,
          },
        },
        activityFeed: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            headline: true,
            actionType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!graduate) {
      return NextResponse.json(
        { error: "Graduate profile not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Suggest people from the same faculty or graduating set, skipping anyone
    // already connected in either direction. A null cohort field would otherwise
    // match every other null, so only values we actually know are used.
    const affinity: ({ facultyName: string } | { graduationYear: string })[] = [];
    if (graduate.facultyName) affinity.push({ facultyName: graduate.facultyName });
    if (graduate.graduationYear) affinity.push({ graduationYear: graduate.graduationYear });

    const [
      connections,
      pendingIncoming,
      eventsJoined,
      unreadNotifications,
      connectionRows,
      facultyGroups,
      yearGroups,
      networkTotal,
      upcomingEvents,
      completion,
      activeJobs,
      recentJobs,
      popularGroups,
      suggestions,
    ] = await Promise.all([
      prisma.connection.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: graduate.id }, { receiverId: graduate.id }],
        },
      }),
      prisma.connection.count({
        where: { status: "PENDING", receiverId: graduate.id },
      }),
      prisma.eventAttendee.count({ where: { graduateId: graduate.id } }),
      prisma.notification.count({
        where: { graduateId: graduate.id, isRead: false },
      }),
      prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          updatedAt: { gte: sixMonthsAgo },
          OR: [{ requesterId: graduate.id }, { receiverId: graduate.id }],
        },
        select: { updatedAt: true },
      }),
      prisma.graduate.groupBy({
        by: ["facultyName"],
        where: {
          facultyName: { not: null },
          showInDirectory: true,
          user: { accountStatus: "ACTIVE" },
        },
        _count: { _all: true },
      }),
      prisma.graduate.groupBy({
        by: ["graduationYear"],
        where: {
          graduationYear: { not: null },
          showInDirectory: true,
          user: { accountStatus: "ACTIVE" },
        },
        _count: { _all: true },
      }),
      prisma.graduate.count({
        where: { showInDirectory: true, user: { accountStatus: "ACTIVE" } },
      }),
      prisma.event.findMany({
        where: { startsAt: { gte: now }, isCancelled: false, isPublic: true },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          id: true,
          title: true,
          location: true,
          startsAt: true,
          type: true,
          _count: { select: { attendees: true } },
        },
      }),
      getProfileCompletion(session.user.id),
      prisma.jobPosting.count({ where: { isActive: true } }),
      prisma.jobPosting.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          companyName: true,
          industry: true,
          jobType: true,
          locationState: true,
          createdAt: true,
        },
      }),
      prisma.alumniGroup.findMany({
        orderBy: { members: { _count: "desc" } },
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          _count: { select: { members: true } },
        },
      }),
      affinity.length > 0
        ? prisma.graduate.findMany({
            where: {
              id: { not: graduate.id },
              showInDirectory: true,
              user: { accountStatus: "ACTIVE" },
              OR: affinity,
              NOT: {
                OR: [
                  { connectionsInitiated: { some: { receiverId: graduate.id } } },
                  { connectionsReceived: { some: { requesterId: graduate.id } } },
                ],
              },
            },
            take: 5,
            select: {
              id: true,
              fullName: true,
              departmentName: true,
              graduationYear: true,
              user: { select: { image: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Cumulative connection growth across the trailing six months.
    const buckets = new Map<string, { label: string; count: number }>();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(monthKey(date), { label: monthLabel(date), count: 0 });
    }
    for (const row of connectionRows) {
      const bucket = buckets.get(monthKey(row.updatedAt));
      if (bucket) bucket.count += 1;
    }
    let running = Math.max(0, connections - connectionRows.length);
    const networkGrowth = [...buckets.values()].map((bucket) => {
      running += bucket.count;
      return { label: bucket.label, added: bucket.count, total: running };
    });

    const facultyDistribution = facultyGroups
      .map((row) => ({ label: row.facultyName ?? "Unknown", count: row._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const cohortDistribution = yearGroups
      .map((row) => ({ label: row.graduationYear ?? "Unknown", count: row._count._all }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-8);

    return NextResponse.json({
      profile: {
        fullName: graduate.fullName,
        registrationNo: graduate.registrationNo,
        departmentName: graduate.departmentName,
        facultyName: graduate.facultyName,
        graduationYear: graduate.graduationYear,
        avatarUrl: graduate.user.image,
      },
      stats: {
        connections,
        pendingConnectionRequests: pendingIncoming,
        profileViews: graduate.profileViews,
        jobApplications: graduate._count.jobApplications,
        groupsJoined: graduate._count.groupMemberships,
        eventsJoined,
        achievements: graduate._count.achievements,
        unreadNotifications,
        networkSize: networkTotal,
      },
      completion: {
        // Shared with GET /api/profile/completion so the dashboard, the profile
        // screen and the mobile client cannot disagree on what "complete" means.
        percent: completion?.percent ?? 0,
        completed: graduate.profileCompleted,
        nextBestAction: completion?.nextBestAction ?? null,
        // `key`, `label` and `done` are kept so existing clients keep parsing;
        // `weight`, `prompt` and `href` are additive.
        checklist:
          completion?.sections.map((section) => ({
            key: section.key,
            label: section.label,
            done: section.done,
            weight: section.weight,
            prompt: section.prompt,
            href: section.href,
          })) ?? [],
      },
      jobs: {
        activeTotal: activeJobs,
        myApplications: graduate._count.jobApplications,
        recent: recentJobs.map((job) => ({
          id: job.id,
          title: job.title,
          companyName: job.companyName,
          industry: job.industry,
          jobType: job.jobType,
          locationState: job.locationState,
          createdAt: job.createdAt.toISOString(),
        })),
      },
      groups: {
        joined: graduate._count.groupMemberships,
        popular: popularGroups.map((group) => ({
          id: group.id,
          name: group.name,
          slug: group.slug,
          type: group.type,
          membersCount: group._count.members,
        })),
      },
      connectionSuggestions: suggestions.map((person) => ({
        id: person.id,
        fullName: person.fullName,
        departmentName: person.departmentName,
        graduationYear: person.graduationYear,
        avatarUrl: person.user?.image ?? null,
      })),
      charts: {
        networkGrowth,
        facultyDistribution,
        cohortDistribution,
      },
      recentActivity: graduate.activityFeed.map((item) => ({
        id: item.id,
        headline: item.headline,
        actionType: item.actionType,
        createdAt: item.createdAt.toISOString(),
      })),
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        type: event.type,
        startsAt: event.startsAt.toISOString(),
        attendeesCount: event._count.attendees,
      })),
    });
  } catch (error) {
    console.error("[DashboardAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
