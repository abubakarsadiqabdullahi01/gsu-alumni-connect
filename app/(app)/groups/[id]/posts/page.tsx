import { DashboardHeader } from "@/components/layout/dashboard-header";
import { GroupPostsClient } from "@/components/groups/group-posts-client";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/platform-settings";

export default async function GroupPostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isFeatureEnabled("featureGroups"))) {
    redirect("/dashboard");
  }

  await requireAuthenticatedUser();
  const { id } = await params;

  return (
    <>
      <DashboardHeader title="Group Posts" />
      <div className="flex-1 p-4 md:p-6">
        <GroupPostsClient groupId={id} />
      </div>
    </>
  );
}
