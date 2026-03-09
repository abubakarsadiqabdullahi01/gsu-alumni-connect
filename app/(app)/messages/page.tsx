import { MessagesClient } from "@/components/messages/messages-client";
import { ClientOnly } from "@/components/shared/client-only";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/platform-settings";

export default async function MessagesPage() {
  if (!(await isFeatureEnabled("featureMessaging"))) {
    redirect("/dashboard");
  }

  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <MessagesClient />
    </ClientOnly>
  );
}
