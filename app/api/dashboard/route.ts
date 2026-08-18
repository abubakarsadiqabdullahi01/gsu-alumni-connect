import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

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
        bio: true,
        dateOfBirth: true,
        linkedinUrl: true,
        nyscState: true,
        nyscYear: true,
        user: { select: { email: true, phone: true, image: true } },
        _count: {
          select: {
            employment: true,
            education: true,
            skills: true,
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
    ]);

    const checklist: ChecklistItem[] = [
      { key: "email", label: "Email address", done: Boolean(graduate.user.email) },
      { key: "phone", label: "Phone number", done: Boolean(graduate.user.phone) },
      { key: "photo", label: "Profile photo", done: Boolean(graduate.user.image) },
      { key: "dateOfBirth", label: "Date of birth", done: Boolean(graduate.dateOfBirth) },
      { key: "bio", label: "Short bio", done: Boolean(graduate.bio) },
      { key: "linkedin", label: "LinkedIn profile", done: Boolean(graduate.linkedinUrl) },
      { key: "nyscState", label: "NYSC state", done: Boolean(graduate.nyscState) },
      { key: "nyscYear", label: "NYSC year", done: Boolean(graduate.nyscYear) },
      { key: "employment", label: "Work experience", done: graduate._count.employment > 0 },
      { key: "education", label: "Education history", done: graduate._count.education > 0 },
      { key: "skills", label: "Skills", done: graduate._count.skills > 0 },
    ];

    const doneCount = checklist.filter((item) => item.done).length;
    const completion = Math.round((doneCount / checklist.length) * 100);

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
        percent: completion,
        completed: graduate.profileCompleted,
        checklist,
      },
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
