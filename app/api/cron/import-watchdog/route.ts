import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_STALE_MINUTES = 10;

function getBearerToken(value: string | null) {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function isAuthorized(req: NextRequest) {
  const configured = process.env.IMPORT_WATCHDOG_SECRET?.trim();
  if (!configured) {
    return process.env.NODE_ENV !== "production";
  }

  const bearer = getBearerToken(req.headers.get("authorization"));
  const headerToken = req.headers.get("x-watchdog-secret")?.trim() ?? null;
  return bearer === configured || headerToken === configured;
}

function getStaleMinutes() {
  const raw = Number(process.env.IMPORT_WATCHDOG_STALE_MINUTES ?? DEFAULT_STALE_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_STALE_MINUTES;
  return Math.floor(raw);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleMinutes = getStaleMinutes();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - staleMinutes * 60 * 1000);

  const activeJobs = await prisma.importJob.findMany({
    where: { status: { in: ["RUNNING", "QUEUED"] } },
    select: {
      id: true,
      status: true,
      heartbeatAt: true,
      startedAt: true,
      createdAt: true,
    },
  });

  const staleJobIds = activeJobs
    .filter((job) => {
      const referenceTime = job.heartbeatAt ?? job.startedAt ?? job.createdAt;
      return referenceTime < staleBefore;
    })
    .map((job) => job.id);

  if (staleJobIds.length === 0) {
    return NextResponse.json({
      ok: true,
      staleMinutes,
      checkedRunningJobs: activeJobs.length,
      markedFailed: 0,
      jobIds: [],
    });
  }

  const update = await prisma.importJob.updateMany({
    where: {
      id: { in: staleJobIds },
      status: "RUNNING",
    },
    data: {
      status: "FAILED",
      completedAt: now,
      heartbeatAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    staleMinutes,
    checkedRunningJobs: activeJobs.length,
    markedFailed: update.count,
    jobIds: staleJobIds,
  });
}
