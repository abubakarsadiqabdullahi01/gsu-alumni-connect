import { GroupsClient } from "@/components/groups/groups-client";
import { ClientOnly } from "@/components/shared/client-only";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/platform-settings";

export default async function GroupsPage() {
  if (!(await isFeatureEnabled("featureGroups"))) {
    redirect("/dashboard");
  }

  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <GroupsClient />
    </ClientOnly>
  );
}
