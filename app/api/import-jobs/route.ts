import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processImportJob } from "@/lib/import/process-import-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 min for background processing

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    fileName?: string;
    fileUrl?: string;
    totalRows?: number;
    selectedSheets?: string[];
  };

  const { fileName, fileUrl, totalRows, selectedSheets } = body;

  if (!fileName || !fileUrl) {
    return NextResponse.json({ error: "fileName and fileUrl are required" }, { status: 400 });
  }

  // ── Check for an already-active job ───────────────────────────────────────
  const activeJob = await prisma.importJob.findFirst({
    where: {
      uploadedById: session.user.id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    select: {
      id: true,
      status: true,
      processedRows: true,
      totalRows: true,
      createdRows: true,
      updatedRows: true,
      failedRows: true,
    },
  });

  if (activeJob) {
    return NextResponse.json(
        { error: "An import is already in progress", job: activeJob },
        { status: 409 }
    );
  }

  // ── Create the job ─────────────────────────────────────────────────────────
  const job = await prisma.importJob.create({
    data: {
      uploadedById: session.user.id,
      fileName,
      fileUrl,
      totalRows: totalRows ?? 0,
      selectedSheets: selectedSheets ?? [],
      status: "QUEUED",
    },
  });

  console.info(`[import-jobs] created job ${job.id} for ${fileName} (${totalRows} rows)`);

  // ── Mark RUNNING immediately ───────────────────────────────────────────────
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });

  // ── Start processing in background, return response immediately ───────────
  // On Vercel Node.js runtime, the function stays alive for maxDuration after
  // the response is sent when you use this pattern.
  setImmediate(async () => {
    try {
      await processImportJob(job.id);
      console.info(`[import-jobs] completed job ${job.id}`);
    } catch (err) {
      console.error(`[import-jobs] job ${job.id} failed:`, err);
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          heartbeatAt: new Date(),
        },
      }).catch(() => {});
    }
  });

  return NextResponse.json({ job }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await prisma.importJob.findMany({
    where: { uploadedById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      failedRows: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}