import { ConnectionsClient } from "@/components/connections/connections-client";
import { ClientOnly } from "@/components/shared/client-only";

export default function ConnectionsPage() {
  return (
    <ClientOnly fallback={<div className="h-[60vh] rounded-xl border bg-muted/40" />}>
      <ConnectionsClient />
    </ClientOnly>
  );
}
