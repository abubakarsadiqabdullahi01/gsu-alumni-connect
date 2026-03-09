import { AchievementsClient } from "@/components/achievements/achievements-client";
import { ClientOnly } from "@/components/shared/client-only";

export default function AchievementsPage() {
  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <AchievementsClient />
    </ClientOnly>
  );
}
