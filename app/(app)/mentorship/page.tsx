import { MentorshipClient } from "@/components/mentorship/mentorship-client";
import { ClientOnly } from "@/components/shared/client-only";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/platform-settings";

export default async function MentorshipPage() {
  if (!(await isFeatureEnabled("featureMentorship"))) {
    redirect("/dashboard");
  }

  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <MentorshipClient />
    </ClientOnly>
  );
}
