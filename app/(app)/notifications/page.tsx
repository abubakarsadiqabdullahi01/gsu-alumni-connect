import { NotificationsClient } from "@/components/notifications/notifications-client";
import { ClientOnly } from "@/components/shared/client-only";

export default function NotificationsPage() {
  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <NotificationsClient />
    </ClientOnly>
  );
}
