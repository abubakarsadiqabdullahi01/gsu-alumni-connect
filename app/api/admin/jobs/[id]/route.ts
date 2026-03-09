import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const job = await prisma.jobPosting.findUnique({
      where: { id },
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
        updatedAt: true,
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
        applications: {
          orderBy: [{ appliedAt: "desc" }],
          select: {
            id: true,
            status: true,
            coverNote: true,
            cvUrl: true,
            appliedAt: true,
            applicant: {
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
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        ...job,
        salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
        applicationsCount: job._count.applications,
      },
    });
  } catch (error) {
    console.error("[AdminJobsAPI][GET_DETAIL] Error:", error);
    return NextResponse.json({ error: "Failed to load job detail." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await req.json()) as {
      action?: "activate" | "deactivate" | "verify" | "unverify";
    };

    if (!body.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        companyName: true,
        isActive: true,
        isVerified: true,
        postedById: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    let nextIsActive = job.isActive;
    let nextIsVerified = job.isVerified;
    let noticeTitle = "Job posting updated";
    let noticeBody = `Your job \"${job.title}\" at ${job.companyName} was updated by admin.`;

    if (body.action === "activate") {
      nextIsActive = true;
      noticeTitle = "Job posting re-opened";
      noticeBody = `Your job \"${job.title}\" is now active again.`;
    }

    if (body.action === "deactivate") {
      nextIsActive = false;
      noticeTitle = "Job posting closed by admin";
      noticeBody = `Your job \"${job.title}\" was set to closed by admin.`;
    }

    if (body.action === "verify") {
      nextIsVerified = true;
      noticeTitle = "Job posting verified";
      noticeBody = `Your job \"${job.title}\" has been verified by admin.`;
    }

    if (body.action === "unverify") {
      nextIsVerified = false;
      noticeTitle = "Job posting verification removed";
      noticeBody = `Verification was removed from your job \"${job.title}\".`;
    }

    const updated = await prisma.jobPosting.update({
      where: { id: job.id },
      data: {
        isActive: nextIsActive,
        isVerified: nextIsVerified,
      },
      select: {
        id: true,
        isActive: true,
        isVerified: true,
      },
    });

    await prisma.notification.create({
      data: {
        graduateId: job.postedById,
        type: "ADMIN_BROADCAST",
        title: noticeTitle,
        body: noticeBody,
        actionUrl: "/jobs",
        metadata: {
          jobId: job.id,
          action: body.action,
        },
      },
    });

    return NextResponse.json({ job: updated });
  } catch (error) {
    console.error("[AdminJobsAPI][PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update job." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        companyName: true,
        postedById: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    await prisma.jobPosting.delete({ where: { id: job.id } });

    await prisma.notification.create({
      data: {
        graduateId: job.postedById,
        type: "ADMIN_BROADCAST",
        title: "Job posting removed",
        body: `Your job \"${job.title}\" at ${job.companyName} was removed by admin.`,
        actionUrl: "/jobs",
        metadata: {
          jobId: job.id,
          action: "delete",
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminJobsAPI][DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete job." }, { status: 500 });
  }
}
