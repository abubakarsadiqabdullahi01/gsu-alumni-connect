import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  Download,
  Eye,
  MessageCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

type RangeKey = "30d" | "90d" | "12m";

type AnalyticsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

function normalizeRange(value: string | undefined): RangeKey {
  if (value === "90d" || value === "12m") return value;
  return "30d";
}

function rangeDays(range: RangeKey) {
  if (range === "90d") return 90;
  if (range === "12m") return 365;
  return 30;
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function periodLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function weekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()}-${end.getDate()}`;
}

function isoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function periodKey(date: Date, range: RangeKey) {
  if (range === "12m") {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }
  return isoWeekKey(date);
}

function toBarHeight(value: number, max: number) {
  if (max <= 0) return 8;
  return Math.max(8, Math.round((value / max) * 100));
}

export default async function AdminAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const sp = await searchParams;
  const range = normalizeRange(sp.range);
  const days = rangeDays(range);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - days * dayMs);
  const prevStart = new Date(now.getTime() - 2 * days * dayMs);

  const monthlyPoints = range === "12m" ? 12 : range === "90d" ? 8 : 6;
  const engagementPoints = range === "12m" ? 12 : range === "90d" ? 12 : 8;

  const monthAnchors = Array.from({ length: monthlyPoints }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthlyPoints - 1 - i), 1);
    return d;
  });

  const engagementAnchors = range === "12m"
    ? Array.from({ length: engagementPoints }).map((_, i) => new Date(now.getFullYear(), now.getMonth() - (engagementPoints - 1 - i), 1))
    : Array.from({ length: engagementPoints }).map((_, i) => {
        const start = new Date(now.getTime() - (engagementPoints - 1 - i) * 7 * dayMs);
        start.setHours(0, 0, 0, 0);
        return start;
      });

  const [mauCurrentRows, mauPrevRows, profileViewsCurrent, profileViewsPrev, jobsCurrent, jobsPrev, messagesCurrent, messagesPrev, registrationRows, loginRows, messageRows, connectionRows] =
    await Promise.all([
      prisma.session.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: currentStart } },
      }),
      prisma.session.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: prevStart, lt: currentStart } },
      }),
      prisma.profileView.count({ where: { viewedAt: { gte: currentStart } } }),
      prisma.profileView.count({ where: { viewedAt: { gte: prevStart, lt: currentStart } } }),
      prisma.jobPosting.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.jobPosting.count({ where: { createdAt: { gte: prevStart, lt: currentStart } } }),
      prisma.message.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.message.count({ where: { createdAt: { gte: prevStart, lt: currentStart } } }),
      prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc('month', "created_at") AS bucket, COUNT(*)::int AS count
        FROM "user"
        WHERE "created_at" >= ${monthAnchors[0]} AND "created_at" < ${now}
        GROUP BY 1
      `,
      range === "12m"
        ? prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('month', "created_at") AS bucket, COUNT(DISTINCT "user_id")::int AS count
            FROM "session"
            WHERE "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `
        : prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('week', "created_at") AS bucket, COUNT(DISTINCT "user_id")::int AS count
            FROM "session"
            WHERE "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `,
      range === "12m"
        ? prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('month', "created_at") AS bucket, COUNT(*)::int AS count
            FROM "message"
            WHERE "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `
        : prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('week', "created_at") AS bucket, COUNT(*)::int AS count
            FROM "message"
            WHERE "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `,
      range === "12m"
        ? prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('month', "created_at") AS bucket, COUNT(*)::int AS count
            FROM "connection"
            WHERE "status" = 'ACCEPTED' AND "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `
        : prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
            SELECT date_trunc('week', "created_at") AS bucket, COUNT(*)::int AS count
            FROM "connection"
            WHERE "status" = 'ACCEPTED' AND "created_at" >= ${engagementAnchors[0]} AND "created_at" < ${now}
            GROUP BY 1
          `,
    ]);

  const registrationMap = new Map(
    registrationRows.map((row) => [periodKey(new Date(row.bucket), "12m"), row.count])
  );
  const loginMap = new Map(
    loginRows.map((row) => [periodKey(new Date(row.bucket), range), row.count])
  );
  const messageMap = new Map(
    messageRows.map((row) => [periodKey(new Date(row.bucket), range), row.count])
  );
  const connectionMap = new Map(
    connectionRows.map((row) => [periodKey(new Date(row.bucket), range), row.count])
  );

  const monthlyRegistrations = monthAnchors.map((start) => ({
    month: periodLabel(start),
    users: registrationMap.get(periodKey(start, "12m")) ?? 0,
  }));

  const weeklyEngagement = engagementAnchors.map((start) => ({
    week: range === "12m" ? periodLabel(start) : weekLabel(start),
    logins: loginMap.get(periodKey(start, range)) ?? 0,
    messages: messageMap.get(periodKey(start, range)) ?? 0,
    connections: connectionMap.get(periodKey(start, range)) ?? 0,
  }));

  const mau = mauCurrentRows.length;
  const mauPrev = mauPrevRows.length;

  const cards = [
    {
      title: "Active Users",
      value: mau,
      trend: percentDelta(mau, mauPrev),
      icon: Users,
    },
    {
      title: "Profile Views",
      value: profileViewsCurrent,
      trend: percentDelta(profileViewsCurrent, profileViewsPrev),
      icon: Eye,
    },
    {
      title: "Jobs Posted",
      value: jobsCurrent,
      trend: percentDelta(jobsCurrent, jobsPrev),
      icon: Briefcase,
    },
    {
      title: "Messages Sent",
      value: messagesCurrent,
      trend: percentDelta(messagesCurrent, messagesPrev),
      icon: MessageCircle,
    },
  ];

  const maxRegistration = Math.max(...monthlyRegistrations.map((x) => x.users), 1);
  const maxLogin = Math.max(...weeklyEngagement.map((x) => x.logins), 1);
  const maxMessage = Math.max(...weeklyEngagement.map((x) => x.messages), 1);
  const maxConnection = Math.max(...weeklyEngagement.map((x) => x.connections), 1);

  const rangeLabel = range === "12m" ? "Last 12 Months" : range === "90d" ? "Last 90 Days" : "Last 30 Days";

  return (
    <>
      <DashboardHeader title="Analytics" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Live growth, engagement, and activity intelligence from production records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant={range === "30d" ? "default" : "outline"} size="sm">
              <Link href="/admin/analytics?range=30d">30d</Link>
            </Button>
            <Button asChild variant={range === "90d" ? "default" : "outline"} size="sm">
              <Link href="/admin/analytics?range=90d">90d</Link>
            </Button>
            <Button asChild variant={range === "12m" ? "default" : "outline"} size="sm">
              <Link href="/admin/analytics?range=12m">12m</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/admin/analytics/export?range=${range}`}>
                <Download className="mr-1.5 size-4" />
                Export CSV
              </Link>
            </Button>
          </div>
        </div>

        <Badge variant="secondary">{rangeLabel}</Badge>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const positive = card.trend >= 0;
            return (
              <Card key={card.title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-extrabold tracking-tight">{card.value.toLocaleString()}</p>
                      <p className={`mt-1 text-[11px] font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
                        {positive ? "+" : ""}
                        {card.trend.toFixed(1)}% vs previous period
                      </p>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4" />
                Registration Trend
              </CardTitle>
              <CardDescription>Monthly account creation progression.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid h-64 grid-cols-12 items-end gap-2">
                {monthlyRegistrations.map((row) => (
                  <div key={row.month} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-blue-500"
                      style={{ height: `${toBarHeight(row.users, maxRegistration)}%` }}
                      title={`${row.month}: ${row.users}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{row.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Peak month:{" "}
                <span className="font-semibold text-foreground">
                  {Math.max(...monthlyRegistrations.map((x) => x.users)).toLocaleString()} users
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" />
                Engagement Trend
              </CardTitle>
              <CardDescription>Logins, messages, and accepted connections by week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium">Unique Logins</span>
                  <Badge variant="outline">{engagementPoints} periods</Badge>
                </div>
                <div className={`grid h-16 items-end gap-1.5 ${engagementPoints === 12 ? "grid-cols-12" : "grid-cols-8"}`}>
                  {weeklyEngagement.map((row) => (
                    <div
                      key={`${row.week}-l`}
                      className="rounded-t bg-[hsl(var(--chart-1))]"
                      style={{ height: `${toBarHeight(row.logins, maxLogin)}%` }}
                      title={`${row.week}: ${row.logins}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium">Messages</span>
                  <Badge variant="outline">{engagementPoints} periods</Badge>
                </div>
                <div className={`grid h-16 items-end gap-1.5 ${engagementPoints === 12 ? "grid-cols-12" : "grid-cols-8"}`}>
                  {weeklyEngagement.map((row) => (
                    <div
                      key={`${row.week}-m`}
                      className="rounded-t bg-[hsl(var(--chart-2))]"
                      style={{ height: `${toBarHeight(row.messages, maxMessage)}%` }}
                      title={`${row.week}: ${row.messages}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium">Accepted Connections</span>
                  <Badge variant="outline">{engagementPoints} periods</Badge>
                </div>
                <div className={`grid h-16 items-end gap-1.5 ${engagementPoints === 12 ? "grid-cols-12" : "grid-cols-8"}`}>
                  {weeklyEngagement.map((row) => (
                    <div
                      key={`${row.week}-c`}
                      className="rounded-t bg-[hsl(var(--chart-3))]"
                      style={{ height: `${toBarHeight(row.connections, maxConnection)}%` }}
                      title={`${row.week}: ${row.connections}`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
