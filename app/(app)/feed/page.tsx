import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { FeedClient } from "@/components/feed/feed-client";

export default async function FeedPage() {
  const session = await requireAuthenticatedUser();
  const isAdmin = session.user.role === "admin";

  const graduate = await prisma.graduate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!isAdmin && !graduate) {
    return (
      <>
        <DashboardHeader title="Activity Feed" />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile not available</CardTitle>
              <CardDescription>Your graduate profile is not linked yet. Contact admin support.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  const feed = await prisma.activityFeedItem.findMany({
    where: isAdmin ? undefined : { graduateId: graduate!.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      actionType: true,
      headline: true,
      isPublic: true,
      createdAt: true,
      graduateId: true,
      graduate: {
        select: {
          fullName: true,
          departmentName: true,
          user: { select: { image: true } },
        },
      },
    },
  });

  const items = feed.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <FeedClient
      initialItems={items}
      currentGraduateId={graduate?.id ?? ""}
      canViewAll={isAdmin}
    />
  );
}
