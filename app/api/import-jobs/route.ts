import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueueImportJob } from "@/lib/queue/import-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ACTIVE_JOB_STALE_MINUTES = 15;

const CreateImportJobSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  totalRows: z.number().int().min(0).max(5_000_000).optional(),
  selectedSheets: z.array(z.string().min(1)).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = CreateImportJobSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fileName, fileUrl, totalRows = 0, selectedSheets = [] } = parsed.data;

  const staleBefore = new Date(Date.now() - ACTIVE_JOB_STALE_MINUTES * 60 * 1000);
  const activeCandidates = await prisma.importJob.findMany({
    where: {
      uploadedById: session.user.id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    select: {
      id: true,
      status: true,
      heartbeatAt: true,
      startedAt: true,
      completedAt: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      failedRows: true,
      createdAt: true,
    },
  });

  const staleIds = activeCandidates
    .filter((job) => {
      const reference = job.heartbeatAt ?? job.startedAt ?? job.createdAt;
      return reference < staleBefore;
    })
    .map((job) => job.id);

  if (staleIds.length > 0) {
    await prisma.importJob.updateMany({
      where: { id: { in: staleIds }, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "FAILED", completedAt: new Date(), heartbeatAt: new Date() },
    });
  }

  const freshActiveJobs = activeCandidates.filter((job) => !staleIds.includes(job.id));
  const existingActiveJob = freshActiveJobs.sort((a, b) => {
    const aTime = (a.heartbeatAt ?? a.startedAt ?? a.createdAt).getTime();
    const bTime = (b.heartbeatAt ?? b.startedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  })[0];

  if (existingActiveJob) {
    return NextResponse.json(
      {
        error: "An import job is already in progress for this admin.",
        job: existingActiveJob,
      },
      { status: 409 }
    );
  }

  const job = await prisma.importJob.create({
    data: {
      uploadedById: session.user.id,
      fileName,
      fileUrl,
      selectedSheets,
      totalRows,
      status: "QUEUED",
    },
    select: {
      id: true,
      status: true,
      totalRows: true,
      createdAt: true,
    },
  });

  try {
    await enqueueImportJob(job.id);
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    console.error("[import-jobs] failed to enqueue:", error);
    return NextResponse.json(
      { error: "Failed to enqueue import job" },
      { status: 500 }
    );
  }

  return NextResponse.json({ job }, { status: 201 });
}
