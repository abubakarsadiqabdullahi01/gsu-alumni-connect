import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/cache/redis-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMPORT_JOB_RUNNING_CACHE_TTL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.IMPORT_JOB_RUNNING_CACHE_TTL_SECONDS ?? "2", 10) || 2
);
const IMPORT_JOB_FINAL_CACHE_TTL_SECONDS = Math.max(
  5,
  Number.parseInt(process.env.IMPORT_JOB_FINAL_CACHE_TTL_SECONDS ?? "30", 10) || 30
);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const cacheKey = `import-job:status:${id}`;
  const cached = await redisGetJson<{
    job: {
      id: string;
      uploadedById: string;
      fileName: string;
      fileUrl: string;
      selectedSheets: string[];
      status: string;
      totalRows: number;
      processedRows: number;
      createdRows: number;
      updatedRows: number;
      failedRows: number;
      lastRow: number;
      heartbeatAt: Date | null;
      startedAt: Date | null;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      errorCount: number;
    };
  }>(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const job = await prisma.importJob.findUnique({
    where: { id },
    select: {
      id: true,
      uploadedById: true,
      fileName: true,
      fileUrl: true,
      selectedSheets: true,
      status: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      failedRows: true,
      lastRow: true,
      heartbeatAt: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { errors: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }

  const payload = {
    job: {
      ...job,
      errorCount: job._count.errors,
      _count: undefined,
    },
  };

  const isFinal = ["FAILED", "COMPLETED", "PARTIAL_SUCCESS", "CANCELLED"].includes(job.status);
  void redisSetJson(
    cacheKey,
    payload,
    isFinal ? IMPORT_JOB_FINAL_CACHE_TTL_SECONDS : IMPORT_JOB_RUNNING_CACHE_TTL_SECONDS
  );

  return NextResponse.json(payload);
}
