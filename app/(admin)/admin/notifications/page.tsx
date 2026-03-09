import { NotificationsClient } from "@/components/notifications/notifications-client";
import { ClientOnly } from "@/components/shared/client-only";

export default function AdminNotificationsPage() {
  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <NotificationsClient
        title="Admin Notifications"
        description="Review operational alerts, moderation updates, and system activity."
        apiBase="/api/admin/notifications"
      />
    </ClientOnly>
  );
}
