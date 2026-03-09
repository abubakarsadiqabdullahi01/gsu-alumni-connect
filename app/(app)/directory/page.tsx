import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { DirectoryClient } from "@/components/directory/directory-client";

export default async function DirectoryPage() {
  await requireAuthenticatedUser();

  const baseWhere = {
    showInDirectory: true,
    user: {
      accountStatus: "ACTIVE" as const,
    },
  };

  const [initialItems, total, departmentGroups, yearGroups] = await Promise.all([
    prisma.graduate.findMany({
      where: baseWhere,
      take: 12,
      orderBy: [{ fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        registrationNo: true,
        departmentName: true,
        facultyName: true,
        graduationYear: true,
        degreeClass: true,
        stateOfOrigin: true,
        bio: true,
        openToOpportunities: true,
        availableForMentorship: true,
        user: {
          select: {
            image: true,
          },
        },
      },
    }),
    prisma.graduate.count({ where: baseWhere }),
    prisma.graduate.groupBy({
      by: ["departmentName"],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { departmentName: "asc" },
    }),
    prisma.graduate.groupBy({
      by: ["graduationYear"],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { graduationYear: "desc" },
    }),
  ]);

  const departments = departmentGroups.map((d) => d.departmentName).filter((d): d is string => Boolean(d));
  const years = yearGroups.map((y) => y.graduationYear).filter((y): y is string => Boolean(y));

  if (initialItems.length === 0) {
    return (
      <>
        <DashboardHeader title="Alumni Directory" />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Directory not available</CardTitle>
              <CardDescription>No public directory profiles available yet.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <DirectoryClient
      departments={departments}
      years={years}
      initialItems={initialItems.map((item) => ({ ...item, connectionStatus: null }))}
      initialPagination={{
        page: 1,
        pageSize: 12,
        total,
        totalPages: Math.max(1, Math.ceil(total / 12)),
      }}
    />
  );
}
