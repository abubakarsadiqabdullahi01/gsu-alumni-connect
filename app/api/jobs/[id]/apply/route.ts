import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/src/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    if (!(await isFeatureEnabled("featureJobBoard"))) {
      return NextResponse.json({ error: "Jobs feature is disabled by admin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await ctx.params;
    const me = await prisma.graduate.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Graduate profile not found." }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { coverNote?: string; cvUrl?: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyName: true,
        isActive: true,
        postedById: true,
      },
    });
    if (!job || !job.isActive) {
      return NextResponse.json({ error: "Job not available." }, { status: 404 });
    }
    if (job.postedById === me.id) {
      return NextResponse.json({ error: "You cannot apply to your own job posting." }, { status: 400 });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: me.id,
        coverNote: body.coverNote?.trim() || null,
        cvUrl: body.cvUrl?.trim() || null,
        status: "APPLIED",
      },
      select: {
        id: true,
        status: true,
        appliedAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        graduateId: job.postedById,
        type: "JOB_MATCH",
        title: "New Job Application",
        body: `${me.fullName} applied for ${job.title} at ${job.companyName}.`,
        actionUrl: "/jobs",
        metadata: {
          applicantId: me.id,
          jobId,
        },
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied for this job." }, { status: 409 });
    }
    console.error("[JobsApplyAPI] Error:", error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }
}
