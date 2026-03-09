import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureJobBoard"))) {
      return NextResponse.json({ error: "Jobs feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim();
    const jobType = (params.get("jobType") ?? "").trim();
    const state = (params.get("state") ?? "").trim();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(20, Math.max(6, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const browseWhere = {
      isActive: true,
      ...(jobType ? { jobType: jobType as any } : {}),
      ...(state ? { locationState: { equals: state, mode: "insensitive" as const } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { companyName: { contains: q, mode: "insensitive" as const } },
              { industry: { contains: q, mode: "insensitive" as const } },
              { locationState: { contains: q, mode: "insensitive" as const } },
              { locationCity: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [jobs, total, myPosts, myApplications] = await Promise.all([
      prisma.jobPosting.findMany({
        where: browseWhere,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          companyName: true,
          description: true,
          requirements: true,
          industry: true,
          jobType: true,
          locationCity: true,
          locationState: true,
          country: true,
          salaryMin: true,
          salaryMax: true,
          salaryVisible: true,
          currencyCode: true,
          applicationUrl: true,
          applicationEmail: true,
          deadline: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          postedById: true,
          postedBy: {
            select: {
              fullName: true,
              departmentName: true,
              user: {
                select: {
                  image: true,
                },
              },
            },
          },
          _count: { select: { applications: true } },
        },
      }),
      prisma.jobPosting.count({ where: browseWhere }),
      prisma.jobPosting.findMany({
        where: { postedById: me.id },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          companyName: true,
          locationCity: true,
          locationState: true,
          jobType: true,
          isActive: true,
          createdAt: true,
          deadline: true,
          _count: { select: { applications: true } },
          applications: {
            orderBy: [{ appliedAt: "desc" }],
            select: {
              id: true,
              status: true,
              appliedAt: true,
              coverNote: true,
              cvUrl: true,
              applicant: {
                select: {
                  fullName: true,
                  registrationNo: true,
                  departmentName: true,
                  facultyName: true,
                  user: {
                    select: {
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.jobApplication.findMany({
        where: { applicantId: me.id },
        orderBy: [{ appliedAt: "desc" }],
        select: {
          id: true,
          status: true,
          appliedAt: true,
          coverNote: true,
          jobId: true,
          job: {
            select: {
              id: true,
              title: true,
              companyName: true,
              jobType: true,
              locationCity: true,
              locationState: true,
              isActive: true,
              deadline: true,
              postedBy: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const appliedJobIds = new Set(myApplications.map((a) => a.jobId));

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        ...job,
        salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
        applicationsCount: job._count.applications,
        hasApplied: appliedJobIds.has(job.id),
        isMine: job.postedById === me.id,
      })),
      myPosts: myPosts.map((job) => ({
        ...job,
        applicationsCount: job._count.applications,
        applications: job.applications.map((app) => ({
          ...app,
          appliedAt: app.appliedAt.toISOString(),
        })),
      })),
      myApplications,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[JobsAPI][GET] Error:", error);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureJobBoard"))) {
      return NextResponse.json({ error: "Jobs feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      companyName?: string;
      description?: string;
      requirements?: string;
      industry?: string;
      jobType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE" | "HYBRID" | "INTERNSHIP";
      locationCity?: string;
      locationState?: string;
      country?: string;
      salaryMin?: number | null;
      salaryMax?: number | null;
      salaryVisible?: boolean;
      currencyCode?: string;
      applicationUrl?: string;
      applicationEmail?: string;
      deadline?: string | null;
    };

    const title = (body.title ?? "").trim();
    const companyName = (body.companyName ?? "").trim();
    if (!title || !companyName) {
      return NextResponse.json({ error: "Title and company are required." }, { status: 400 });
    }

    const job = await prisma.jobPosting.create({
      data: {
        postedById: me.id,
        title,
        companyName,
        description: body.description?.trim() || null,
        requirements: body.requirements?.trim() || null,
        industry: body.industry?.trim() || null,
        jobType: body.jobType ?? "FULL_TIME",
        locationCity: body.locationCity?.trim() || null,
        locationState: body.locationState?.trim() || null,
        country: body.country?.trim() || "Nigeria",
        salaryMin: body.salaryMin ?? null,
        salaryMax: body.salaryMax ?? null,
        salaryVisible: Boolean(body.salaryVisible),
        currencyCode: body.currencyCode?.trim() || "NGN",
        applicationUrl: body.applicationUrl?.trim() || null,
        applicationEmail: body.applicationEmail?.trim() || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        isActive: true,
      },
    });

    await prisma.activityFeedItem.create({
      data: {
        graduateId: me.id,
        actionType: "POSTED_JOB",
        headline: `${me.fullName} posted a new job: ${title} at ${companyName}`,
        isPublic: true,
        metadata: {
          title,
          companyName,
          jobId: job.id,
        },
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("[JobsAPI][POST] Error:", error);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
