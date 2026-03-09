import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RangeKey = "30d" | "90d" | "12m";

function normalizeRange(value: string | null): RangeKey {
  if (value === "90d" || value === "12m") return value;
  return "30d";
}

function rangeDays(range: RangeKey) {
  if (range === "90d") return 90;
  if (range === "12m") return 365;
  return 30;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const range = normalizeRange(req.nextUrl.searchParams.get("range"));
    const days = rangeDays(range);
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const currentStart = new Date(now.getTime() - days * dayMs);
    const prevStart = new Date(now.getTime() - 2 * days * dayMs);

    const [mauCurrentRows, mauPrevRows, profileViewsCurrent, profileViewsPrev, jobsCurrent, jobsPrev, messagesCurrent, messagesPrev] =
      await Promise.all([
        prisma.session.groupBy({ by: ["userId"], where: { createdAt: { gte: currentStart } } }),
        prisma.session.groupBy({ by: ["userId"], where: { createdAt: { gte: prevStart, lt: currentStart } } }),
        prisma.profileView.count({ where: { viewedAt: { gte: currentStart } } }),
        prisma.profileView.count({ where: { viewedAt: { gte: prevStart, lt: currentStart } } }),
        prisma.jobPosting.count({ where: { createdAt: { gte: currentStart } } }),
        prisma.jobPosting.count({ where: { createdAt: { gte: prevStart, lt: currentStart } } }),
        prisma.message.count({ where: { createdAt: { gte: currentStart } } }),
        prisma.message.count({ where: { createdAt: { gte: prevStart, lt: currentStart } } }),
      ]);

    const rows: Array<[string, string | number]> = [
      ["range", range],
      ["generated_at", now.toISOString()],
      ["period_start", currentStart.toISOString()],
      ["period_end", now.toISOString()],
      ["active_users", mauCurrentRows.length],
      ["active_users_previous_period", mauPrevRows.length],
      ["profile_views", profileViewsCurrent],
      ["profile_views_previous_period", profileViewsPrev],
      ["jobs_posted", jobsCurrent],
      ["jobs_posted_previous_period", jobsPrev],
      ["messages_sent", messagesCurrent],
      ["messages_sent_previous_period", messagesPrev],
    ];

    const csv = ["metric,value", ...rows.map(([k, v]) => `${escapeCsv(k)},${escapeCsv(v)}`)].join("\n");
    const filename = `analytics-${range}-${now.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[AdminAnalyticsExport][GET] Error:", error);
    return NextResponse.json({ error: "Failed to export analytics." }, { status: 500 });
  }
}

