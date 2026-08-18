import { prisma } from "@/lib/db";
import { getAlumniGeography } from "@/lib/map/alumni-geography";

/**
 * Member-safe platform insights.
 *
 * Everything here is a count. No names, ids, salaries or coordinates are
 * returned, which is what makes it safe to expose to ordinary members rather
 * than keeping it behind the admin console.
 */
export type InsightBucket = {
  name: string;
  count: number;
};

export type AlumniInsights = {
  alumni: {
    total: number;
    byState: InsightBucket[];
    byFaculty: InsightBucket[];
    byYear: InsightBucket[];
  };
  jobs: {
    activeTotal: number;
    byIndustry: InsightBucket[];
    byType: InsightBucket[];
  };
  mentorship: {
    total: number;
    availableMentors: number;
    byStatus: InsightBucket[];
  };
  events: {
    upcoming: number;
    totalAttendance: number;
    byType: InsightBucket[];
  };
  generatedAt: string;
};

/** Only alumni who opted into the directory on an active account are ever counted. */
const VISIBLE_GRADUATE = {
  showInDirectory: true,
  user: { accountStatus: "ACTIVE" as const },
};

function toBuckets<T extends { _count: { _all: number } }>(
  rows: T[],
  label: (row: T) => string | null,
  fallback: string
): InsightBucket[] {
  return rows
    .map((row) => ({
      name: label(row) ?? fallback,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getAlumniInsights(): Promise<AlumniInsights> {
  const now = new Date();

  const [
    geography,
    byFacultyRows,
    byYearRows,
    activeJobs,
    jobsByIndustryRows,
    jobsByTypeRows,
    mentorshipRows,
    mentorshipTotal,
    availableMentors,
    eventsByTypeRows,
    upcomingEvents,
    totalAttendance,
  ] = await Promise.all([
    getAlumniGeography(),
    prisma.graduate.groupBy({
      by: ["facultyCode"],
      where: VISIBLE_GRADUATE,
      _count: { _all: true },
    }),
    prisma.graduate.groupBy({
      by: ["graduationYear"],
      where: VISIBLE_GRADUATE,
      _count: { _all: true },
    }),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobPosting.groupBy({
      by: ["industry"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.jobPosting.groupBy({
      by: ["jobType"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.mentorship.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.mentorship.count(),
    prisma.graduate.count({
      where: { ...VISIBLE_GRADUATE, availableForMentorship: true },
    }),
    prisma.event.groupBy({
      by: ["type"],
      where: { isCancelled: false },
      _count: { _all: true },
    }),
    prisma.event.count({
      where: { isCancelled: false, startsAt: { gt: now } },
    }),
    prisma.eventAttendee.count(),
  ]);

  return {
    alumni: {
      // Geography counts only alumni we can place; faculty and year cover everyone.
      total: byFacultyRows.reduce((sum, row) => sum + row._count._all, 0),
      byState: geography.states.map((s) => ({ name: s.state, count: s.count })),
      byFaculty: toBuckets(byFacultyRows, (row) => row.facultyCode, "Unspecified"),
      byYear: toBuckets(byYearRows, (row) => row.graduationYear, "Unspecified"),
    },
    jobs: {
      activeTotal: activeJobs,
      byIndustry: toBuckets(jobsByIndustryRows, (row) => row.industry, "Unspecified"),
      byType: toBuckets(jobsByTypeRows, (row) => row.jobType, "Unspecified"),
    },
    mentorship: {
      total: mentorshipTotal,
      availableMentors,
      byStatus: toBuckets(mentorshipRows, (row) => row.status, "UNKNOWN"),
    },
    events: {
      upcoming: upcomingEvents,
      totalAttendance,
      byType: toBuckets(eventsByTypeRows, (row) => row.type, "Unspecified"),
    },
    generatedAt: now.toISOString(),
  };
}
