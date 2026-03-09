import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ id: string; applicationId: string }>;
};

const ALLOWED_STATUS = new Set(["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED"]);

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: jobId, applicationId } = await ctx.params;
    const body = (await req.json()) as { status?: string };
    const nextStatus = (body.status ?? "").toUpperCase();

    if (!ALLOWED_STATUS.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid application status." }, { status: 400 });
    }

    const existing = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        jobId: true,
        status: true,
        applicantId: true,
        job: {
          select: {
            id: true,
            title: true,
            companyName: true,
          },
        },
      },
    });

    if (!existing || existing.jobId !== jobId) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: { status: nextStatus },
      select: {
        id: true,
        status: true,
        appliedAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        graduateId: existing.applicantId,
        type: "JOB_MATCH",
        title: "Job application update",
        body: `Your application for ${existing.job.title} at ${existing.job.companyName} is now ${nextStatus}.`,
        actionUrl: "/jobs",
        metadata: {
          jobId,
          applicationId: existing.id,
          status: nextStatus,
        },
      },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("[AdminJobsAPI][PATCH_APPLICATION] Error:", error);
    return NextResponse.json({ error: "Failed to update application status." }, { status: 500 });
  }
}
