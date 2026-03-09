import { JobsClient } from "@/components/jobs/jobs-client";
import { ClientOnly } from "@/components/shared/client-only";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/platform-settings";

export default async function JobsPage() {
  if (!(await isFeatureEnabled("featureJobBoard"))) {
    redirect("/dashboard");
  }

  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <JobsClient />
    </ClientOnly>
  );
}
