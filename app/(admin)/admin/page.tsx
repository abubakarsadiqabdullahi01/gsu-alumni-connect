import Link from "next/link";
import {
  Activity,
  Briefcase,
  CalendarDays,
  MessageSquare,
  Shield,
  Upload,
  Users,
  UsersRound,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db";

function percentChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0%" : "+100%";
  const value = ((current - previous) / previous) * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    suspendedUsers,
    usersThisMonth,
    usersPrevMonth,
    totalGraduates,
    profileCompletedCount,
    jobsActive,
    jobsTotal,
    applicationsTotal,
    groupsTotal,
    groupMembersTotal,
    eventsUpcoming,
    eventsTotal,
    mentorshipPending,
    mentorshipActive,
    messages24h,
    recentUploads,
    recentEvents,
    recentJobs,
    facultyGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.user.count({ where: { accountStatus: "PENDING" } }),
    prisma.user.count({ where: { accountStatus: "SUSPENDED" } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.graduate.count(),
    prisma.graduate.count({ where: { profileCompleted: true } }),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobPosting.count(),
    prisma.jobApplication.count(),
    prisma.alumniGroup.count(),
    prisma.groupMember.count(),
    prisma.event.count({ where: { startsAt: { gte: now }, isCancelled: false } }),
    prisma.event.count(),
    prisma.mentorship.count({ where: { status: "PENDING" } }),
    prisma.mentorship.count({ where: { status: "ACCEPTED" } }),
    prisma.message.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    prisma.uploadAuditLog.findMany({
      orderBy: [{ startedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        fileName: true,
        totalRows: true,
        created: true,
        updated: true,
        failed: true,
        status: true,
        startedAt: true,
      },
    }),
    prisma.event.findMany({
      orderBy: [{ startsAt: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        location: true,
        startsAt: true,
        isCancelled: true,
        _count: { select: { attendees: true } },
      },
    }),
    prisma.jobPosting.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        companyName: true,
        isActive: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    }),
    prisma.graduate.groupBy({
      by: ["facultyName"],
      where: { facultyName: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const completionRate = totalGraduates > 0 ? Math.round((profileCompletedCount / totalGraduates) * 100) : 0;
  const activationRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const monthGrowth = percentChange(usersThisMonth, usersPrevMonth);

  const topFaculties = facultyGroups
    .map((f) => ({ name: f.facultyName ?? "Unknown", count: f._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  const facultyMax = Math.max(...topFaculties.map((f) => f.count), 1);

  return (
    <>
      <DashboardHeader title="Admin Overview" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Executive Admin Dashboard</CardTitle>
              <CardDescription>
                Real-time operational intelligence across alumni data, engagement, and growth.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Open User View</Link>
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/50 bg-gradient-to-br from-sky-50 to-cyan-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-3xl font-extrabold">{totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-sky-700">{monthGrowth} monthly growth</p>
                </div>
                <Users className="size-5 text-sky-700" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-3xl font-extrabold">{activeUsers.toLocaleString()}</p>
                  <p className="text-xs text-emerald-700">{activationRate}% activation</p>
                </div>
                <Shield className="size-5 text-emerald-700" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending Accounts</p>
                  <p className="text-3xl font-extrabold">{pendingUsers.toLocaleString()}</p>
                  <p className="text-xs text-amber-700">Suspended: {suspendedUsers.toLocaleString()}</p>
                </div>
                <UsersRound className="size-5 text-amber-700" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50 to-indigo-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Messages (24h)</p>
                  <p className="text-3xl font-extrabold">{messages24h.toLocaleString()}</p>
                  <p className="text-xs text-violet-700">Live engagement velocity</p>
                </div>
                <MessageSquare className="size-5 text-violet-700" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Core Platform Metrics</CardTitle>
              <CardDescription>Cross-module operational status.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Jobs</p>
                <p className="mt-1 text-2xl font-bold">{jobsActive.toLocaleString()} active</p>
                <p className="text-xs text-muted-foreground">{jobsTotal.toLocaleString()} total • {applicationsTotal.toLocaleString()} applications</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Events</p>
                <p className="mt-1 text-2xl font-bold">{eventsUpcoming.toLocaleString()} upcoming</p>
                <p className="text-xs text-muted-foreground">{eventsTotal.toLocaleString()} total events</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Groups</p>
                <p className="mt-1 text-2xl font-bold">{groupsTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{groupMembersTotal.toLocaleString()} memberships</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Mentorship</p>
                <p className="mt-1 text-2xl font-bold">{mentorshipActive.toLocaleString()} active</p>
                <p className="text-xs text-muted-foreground">{mentorshipPending.toLocaleString()} pending</p>
              </div>
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Profile Completion Health</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>{profileCompletedCount.toLocaleString()} / {totalGraduates.toLocaleString()} graduates completed</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Faculty Coverage</CardTitle>
              <CardDescription>Top faculties by graduate volume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFaculties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No faculty data available.</p>
              ) : (
                topFaculties.map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{f.name}</span>
                      <Badge variant="secondary">{f.count}</Badge>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div className="h-full rounded bg-primary/70" style={{ width: `${Math.round((f.count / facultyMax) * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Upload className="size-4" /> Latest Uploads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upload records yet.</p>
              ) : (
                recentUploads.map((u) => (
                  <div key={u.id} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{u.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Rows {u.totalRows.toLocaleString()} • Created {u.created} • Updated {u.updated} • Failed {u.failed}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge variant={u.status === "COMPLETED" ? "secondary" : "outline"}>{u.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">{new Date(u.startedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4" /> Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                recentEvents.map((e) => (
                  <div key={e.id} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(e.startsAt).toLocaleString()} • {e.location}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge variant={e.isCancelled ? "destructive" : "secondary"}>{e.isCancelled ? "Cancelled" : "Active"}</Badge>
                      <span className="text-[11px] text-muted-foreground">{e._count.attendees} attendees</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="size-4" /> Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job postings available.</p>
              ) : (
                recentJobs.map((j) => (
                  <div key={j.id} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{j.title}</p>
                    <p className="text-[11px] text-muted-foreground">{j.companyName}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge variant={j.isActive ? "secondary" : "outline"}>{j.isActive ? "Open" : "Closed"}</Badge>
                      <span className="text-[11px] text-muted-foreground">{j._count.applications} applicants</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/graduates"><Users className="mr-1.5 size-4" />Manage Graduates</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/uploads"><Upload className="mr-1.5 size-4" />Review Uploads</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/achievements"><Shield className="mr-1.5 size-4" />Moderate Achievements</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/analytics"><Activity className="mr-1.5 size-4" />Open Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

