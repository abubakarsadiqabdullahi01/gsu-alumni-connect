import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { JobType, type Prisma } from "@/src/generated/prisma";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";
import { getAdminCacheVersion } from "@/lib/cache/admin-cache-version";

const ADMIN_JOBS_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.ADMIN_JOBS_CACHE_TTL_SECONDS ?? "20", 10) || 20
);

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(params.get("pageSize") ?? "12", 10) || 12));
    const skip = (page - 1) * pageSize;

    const q = (params.get("q") ?? "").trim();
    const status = (params.get("status") ?? "all").trim();
    const jobType = (params.get("jobType") ?? "all").trim();
    const verified = (params.get("verified") ?? "all").trim();

    const cacheVersion = await getAdminCacheVersion("jobs");
    const cacheKey = `admin:jobs:v${cacheVersion}:${session.user.id}:p${page}:ps${pageSize}:q:${encodeURIComponent(q)}:st:${encodeURIComponent(status)}:jt:${encodeURIComponent(jobType)}:vf:${encodeURIComponent(verified)}`;
    const cached = await redisGetJson<{
      jobs: Array<{
        id: string;
        title: string;
        companyName: string;
        industry: string | null;
        jobType: string;
        locationCity: string | null;
        locationState: string | null;
        country: string | null;
        isActive: boolean;
        isVerified: boolean;
        createdAt: Date;
        deadline: Date | null;
        postedBy: {
          id: string;
          fullName: string;
          registrationNo: string;
          facultyName: string | null;
          departmentName: string | null;
          user: {
            email: string;
            phone: string | null;
          };
        };
        applicationsCount: number;
      }>;
      stats: {
        totalJobs: number;
        activeJobs: number;
        closedJobs: number;
        verifiedJobs: number;
        totalApplications: number;
      };
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: Prisma.JobPostingWhereInput = {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { companyName: { contains: q, mode: "insensitive" as const } },
              { industry: { contains: q, mode: "insensitive" as const } },
              { locationState: { contains: q, mode: "insensitive" as const } },
              { locationCity: { contains: q, mode: "insensitive" as const } },
              { postedBy: { fullName: { contains: q, mode: "insensitive" as const } } },
              { postedBy: { registrationNo: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "closed" ? { isActive: false } : {}),
      ...(jobType !== "all" && Object.values(JobType).includes(jobType as JobType)
        ? { jobType: jobType as JobType }
        : {}),
      ...(verified === "verified" ? { isVerified: true } : {}),
      ...(verified === "unverified" ? { isVerified: false } : {}),
    };

    const [jobs, total, totalJobs, activeJobs, totalApplications, verifiedJobs] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          companyName: true,
          industry: true,
          jobType: true,
          locationCity: true,
          locationState: true,
          country: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          deadline: true,
          postedBy: {
            select: {
              id: true,
              fullName: true,
              registrationNo: true,
              facultyName: true,
              departmentName: true,
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.count(),
      prisma.jobPosting.count({ where: { isActive: true } }),
      prisma.jobApplication.count(),
      prisma.jobPosting.count({ where: { isVerified: true } }),
    ]);

    const payload = {
      jobs: jobs.map((job) => ({
        ...job,
        applicationsCount: job._count.applications,
      })),
      stats: {
        totalJobs,
        activeJobs,
        closedJobs: Math.max(0, totalJobs - activeJobs),
        verifiedJobs,
        totalApplications,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    void redisSetJson(cacheKey, payload, ADMIN_JOBS_CACHE_TTL_SECONDS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[AdminJobsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}
