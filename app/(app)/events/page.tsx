import { EventsClient } from "@/components/events/events-client";
import { ClientOnly } from "@/components/shared/client-only";

export default function EventsPage() {
  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <EventsClient />
    </ClientOnly>
  );
}
