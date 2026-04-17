import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // ── Check for an already-active job for this admin ────────────────────────
  const activeJob = await prisma.importJob.findFirst({
    where: {
      uploadedById: session.user.id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    select: { id: true, status: true },
  });

  if (activeJob) {
    return NextResponse.json(
        { error: "An import is already in progress", job: activeJob },
        { status: 409 }
    );
  }

  // ── Create the job record ──────────────────────────────────────────────────
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

  // ── Self-trigger: immediately kick off processing ──────────────────────────
  // Fire-and-forget — don't await. This avoids the 60-second cron delay.
  // The cron is still a safety net if this request fails.
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Resolve the correct base URL — never fall back to localhost in production
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!appUrl || appUrl.includes("localhost")) {
    console.warn("[import-jobs] NEXT_PUBLIC_APP_URL not set or is localhost — skipping self-trigger");
  } else if (cronSecret) {
    fetch(`${appUrl}/api/cron/process-import`, {
      method: "GET",
      headers: { authorization: `Bearer ${cronSecret}` },
    }).catch((err) => {
      console.warn(`[import-jobs] self-trigger failed: ${err?.message}`);
    });
  } else {
    console.warn("[import-jobs] CRON_SECRET not set — skipping self-trigger, relying on cron");
  }

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