import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AlumniMapClient } from "@/components/map/alumni-map-client";
import { ClientOnly } from "@/components/shared/client-only";
import { getAlumniGeography } from "@/lib/map/alumni-geography";
import { isFeatureEnabled } from "@/lib/platform-settings";
import { redirect } from "next/navigation";

export default async function MapPage() {
  if (!(await isFeatureEnabled("featureMap"))) {
    redirect("/dashboard");
  }

  // Aggregated on the server: the browser never receives a per-person row.
  const geography = await getAlumniGeography();

  return (
    <>
      <DashboardHeader title="Alumni Map" />
      <ClientOnly
        fallback={
          <div className="mx-4 my-6 h-[620px] animate-pulse rounded-xl border bg-muted/40 md:mx-6" />
        }
      >
        <AlumniMapClient geography={geography} />
      </ClientOnly>
    </>
  );
}
