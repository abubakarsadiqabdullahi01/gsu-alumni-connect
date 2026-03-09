import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminGraduatesListPremium } from "@/components/admin/graduates-list-premium";
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, CheckCircle, Building2 } from "lucide-react";
import { prisma } from "@/lib/db";

// ── Stat cards ───────────────────────────────────────────────────────
async function getStats() {
  try {
    const [
      totalGraduates,
      profilesCompleted,
      activeUsers,
      departmentsCount,
    ] = await Promise.all([
      prisma.graduate.count(),
      prisma.graduate.count({ where: { profileCompleted: true } }),
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.graduate.groupBy({
        by: ['departmentName'],
        where: { departmentName: { not: null } },
      }),
    ]);

    return {
      totalGraduates,
      profilesCompleted,
      activeUsers,
      departmentsCount: departmentsCount.length,
      completionRate: totalGraduates > 0 
        ? ((profilesCompleted / totalGraduates) * 100).toFixed(1)
        : '0',
    };
  } catch (error) {
    console.error('[AdminGraduates] Stats fetch error:', error);
    return {
      totalGraduates: 0,
      profilesCompleted: 0,
      activeUsers: 0,
      departmentsCount: 0,
      completionRate: '0',
    };
  }
}

// ── Stat Card Component ──────────────────────────────────────────────
function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  gradient: string;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl ${gradient}`}>
      <div className="absolute inset-0 opacity-5" />
      <CardContent className="relative pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">{title}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {trend && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>}
            </div>
            {subtitle && <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex-shrink-0">
            {Icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminGraduatesPage() {
  const stats = await getStats();

  return (
    <>
      <DashboardHeader title="Alumni Directory" subtitle="Manage and view all registered graduates" />
      
      <div className="flex-1 space-y-8 p-4 md:p-6 lg:p-8">
        {/* ── Premium Stats Grid ────────────────────────────────────────────── */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Graduates */}
          <StatCard
            icon={
              <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/5">
                <Users className="size-7 text-blue-600 dark:text-blue-400" />
              </div>
            }
            title="Total Graduates"
            value={stats.totalGraduates.toLocaleString()}
            subtitle="Registered alumni members"
            trend="+12% this month"
            gradient="bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/20 dark:to-blue-900/10"
          />

          {/* Active Users */}
          <StatCard
            icon={
              <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5">
                <CheckCircle className="size-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            }
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            subtitle="Currently active members"
            trend="+8% this month"
            gradient="bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/20 dark:to-emerald-900/10"
          />

          {/* Profile Completion Rate */}
          <StatCard
            icon={
              <div className="p-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/5">
                <GraduationCap className="size-7 text-purple-600 dark:text-purple-400" />
              </div>
            }
            title="Profile Completion"
            value={`${stats.completionRate}%`}
            subtitle={`${stats.profilesCompleted.toLocaleString()} of ${stats.totalGraduates.toLocaleString()} complete`}
            trend="+5% this month"
            gradient="bg-gradient-to-br from-purple-50/80 to-purple-100/40 dark:from-purple-950/20 dark:to-purple-900/10"
          />

          {/* Departments */}
          <StatCard
            icon={
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5">
                <Building2 className="size-7 text-amber-600 dark:text-amber-400" />
              </div>
            }
            title="Departments"
            value={stats.departmentsCount.toLocaleString()}
            subtitle="Academic departments represented"
            trend="+2 this month"
            gradient="bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10"
          />
        </div>

        {/* ── Main Graduates List ──────────────────────────────────────────── */}
        <div className="animate-in fade-in duration-500">
          <AdminGraduatesListPremium />
        </div>
      </div>
    </>
  );
}
