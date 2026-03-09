import Link from "next/link";
import { CheckCircle2, KeyRound, Radio, Server, ShieldCheck, Users } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { AdminSettingsEditor } from "@/components/admin/admin-settings-editor";

export default async function AdminSettingsPage() {
  const [totalUsers, totalGraduates, totalGroups, totalJobs, totalMentorships] = await Promise.all([
    prisma.user.count(),
    prisma.graduate.count(),
    prisma.alumniGroup.count(),
    prisma.jobPosting.count(),
    prisma.mentorship.count(),
  ]);

  const pusherConfigured = Boolean(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );

  const modules = [
    { name: "Graduates", href: "/admin/graduates", api: "/api/admin/graduates", status: "live" },
    { name: "Uploads", href: "/admin/uploads", api: "/api/admin/uploads/*", status: "live" },
    { name: "Analytics", href: "/admin/analytics", api: "/api/admin/analytics/*", status: "live" },
    { name: "Jobs", href: "/admin/jobs", api: "/api/admin/jobs/*", status: "live" },
    { name: "Groups", href: "/admin/groups", api: "/api/admin/groups/*", status: "live" },
    { name: "Mentorship", href: "/admin/mentorship", api: "/api/admin/mentorship/*", status: "live" },
    { name: "Network", href: "/admin/network", api: "/api/admin/network", status: "live" },
  ] as const;

  return (
    <>
      <DashboardHeader title="Admin Settings" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Current System Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Operational snapshot of features that are implemented and active right now.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Users</p><p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Graduates</p><p className="text-2xl font-bold">{totalGraduates.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Groups</p><p className="text-2xl font-bold">{totalGroups.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Jobs</p><p className="text-2xl font-bold">{totalJobs.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Mentorships</p><p className="text-2xl font-bold">{totalMentorships.toLocaleString()}</p></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Security & Auth</CardTitle>
              <CardDescription>Authentication stack currently active.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Better Auth session-based authentication</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Registration-number login endpoint</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Role-based admin guards on `/api/admin/*`</p>
              <p className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Role scripts: `auth:make-admin`, `auth:make-user`</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Radio className="size-4" /> Real-Time</CardTitle>
              <CardDescription>Pusher integration status for messaging/events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                {pusherConfigured ? (
                  <><CheckCircle2 className="size-4 text-emerald-500" /> Pusher env configured</>
                ) : (
                  <><Server className="size-4 text-amber-500" /> Pusher env incomplete</>
                )}
              </p>
              <p className="text-muted-foreground">
                Required: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" /> Active Admin Modules</CardTitle>
            <CardDescription>Only modules with real backend support are listed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modules.map((module) => (
              <div key={module.name} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{module.name}</p>
                  <p className="text-xs text-muted-foreground">API: `{module.api}`</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700">{module.status.toUpperCase()}</Badge>
                  <Link href={module.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persisted Settings Center</CardTitle>
            <CardDescription>
              Database-backed admin settings for platform identity, auth policy, and feature flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminSettingsEditor />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
