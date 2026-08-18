import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

/**
 * One search bar across alumni, groups, jobs and events.
 *
 * Disabled modules are skipped rather than searched-and-hidden, so a member
 * never gets a result they cannot open. Each section is capped independently:
 * the point is a fast switcher, not an exhaustive result set — deep listings
 * stay with the per-module endpoints that already paginate.
 */
const SECTION_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({
        query,
        alumni: [],
        groups: [],
        jobs: [],
        events: [],
        total: 0,
      });
    }

    const [jobsEnabled, groupsEnabled] = await Promise.all([
      isFeatureEnabled("featureJobBoard"),
      isFeatureEnabled("featureGroups"),
    ]);

    const contains = { contains: query, mode: "insensitive" as const };

    const [alumni, groups, jobs, events] = await Promise.all([
      prisma.graduate.findMany({
        where: {
          showInDirectory: true,
          user: { accountStatus: "ACTIVE" },
          OR: [
            { fullName: contains },
            { registrationNo: contains },
            { departmentName: contains },
            { facultyName: contains },
          ],
        },
        take: SECTION_LIMIT,
        select: {
          id: true,
          fullName: true,
          departmentName: true,
          graduationYear: true,
          user: { select: { image: true } },
        },
      }),

      groupsEnabled
        ? prisma.alumniGroup.findMany({
            where: { OR: [{ name: contains }, { description: contains }] },
            take: SECTION_LIMIT,
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              _count: { select: { members: true } },
            },
          })
        : Promise.resolve([]),

      jobsEnabled
        ? prisma.jobPosting.findMany({
            where: {
              isActive: true,
              OR: [{ title: contains }, { companyName: contains }, { industry: contains }],
            },
            orderBy: { createdAt: "desc" },
            take: SECTION_LIMIT,
            select: {
              id: true,
              title: true,
              companyName: true,
              jobType: true,
              locationState: true,
            },
          })
        : Promise.resolve([]),

      prisma.event.findMany({
        where: {
          isCancelled: false,
          isPublic: true,
          OR: [{ title: contains }, { location: contains }],
        },
        orderBy: { startsAt: "asc" },
        take: SECTION_LIMIT,
        select: { id: true, title: true, location: true, type: true, startsAt: true },
      }),
    ]);

    return NextResponse.json({
      query,
      alumni: alumni.map((person) => ({
        id: person.id,
        fullName: person.fullName,
        departmentName: person.departmentName,
        graduationYear: person.graduationYear,
        avatarUrl: person.user?.image ?? null,
        href: `/directory/${person.id}`,
      })),
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        membersCount: group._count.members,
        href: `/groups/${group.id}`,
      })),
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        jobType: job.jobType,
        locationState: job.locationState,
        href: `/jobs`,
      })),
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        type: event.type,
        startsAt: event.startsAt.toISOString(),
        href: `/events`,
      })),
      total: alumni.length + groups.length + jobs.length + events.length,
    });
  } catch (error) {
    console.error("[SearchAPI] Error:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
