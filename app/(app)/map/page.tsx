import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AlumniMapClient } from "@/components/map/alumni-map-client";
import { ClientOnly } from "@/components/shared/client-only";
import { getStateCenter } from "@/lib/nigeria-state-centers";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/platform-settings";
import { redirect } from "next/navigation";

type LocationPoint = {
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  lga: string | null;
  graduate: {
    fullName: string;
    courseCode: string | null;
    graduationYear: string | null;
    facultyCode: string | null;
  };
};

export default async function MapPage() {
  if (!(await isFeatureEnabled("featureMap"))) {
    redirect("/dashboard");
  }

  const [locationRows, fallbackRows] = await Promise.all([
    prisma.graduateLocation.findMany({
      where: {
        graduate: {
          showInDirectory: true,
          user: { accountStatus: "ACTIVE" },
        },
      },
      select: {
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        graduate: {
          select: {
            id: true,
            fullName: true,
            courseCode: true,
            graduationYear: true,
            facultyCode: true,
            stateOfOrigin: true,
            lga: true,
          },
        },
      },
    }),
    prisma.graduate.findMany({
      where: {
        showInDirectory: true,
        location: { is: null },
        stateOfOrigin: { not: null },
        user: { accountStatus: "ACTIVE" },
      },
      select: {
        id: true,
        fullName: true,
        courseCode: true,
        graduationYear: true,
        facultyCode: true,
        stateOfOrigin: true,
        lga: true,
      },
    }),
  ]);

  const locations: LocationPoint[] = [];
  const seeded = new Set<string>();

  for (const row of locationRows) {
    const state = row.state ?? row.graduate.stateOfOrigin;
    let latitude = row.latitude ? Number(row.latitude) : null;
    let longitude = row.longitude ? Number(row.longitude) : null;

    if (latitude == null || longitude == null) {
      const center = getStateCenter(state);
      if (!center) continue;
      latitude = center.latitude;
      longitude = center.longitude;
    }

    seeded.add(row.graduate.id);
    locations.push({
      latitude,
      longitude,
      city: row.city,
      state,
      lga: row.graduate.lga,
      graduate: {
        fullName: row.graduate.fullName,
        courseCode: row.graduate.courseCode,
        graduationYear: row.graduate.graduationYear,
        facultyCode: row.graduate.facultyCode,
      },
    });
  }

  for (const grad of fallbackRows) {
    if (seeded.has(grad.id)) continue;
    const center = getStateCenter(grad.stateOfOrigin);
    if (!center) continue;
    locations.push({
      latitude: center.latitude,
      longitude: center.longitude,
      city: null,
      state: grad.stateOfOrigin,
      lga: grad.lga,
      graduate: {
        fullName: grad.fullName,
        courseCode: grad.courseCode,
        graduationYear: grad.graduationYear,
        facultyCode: grad.facultyCode,
      },
    });
  }

  return (
    <>
      <DashboardHeader title="Alumni Map" />
      <ClientOnly fallback={<div className="mx-4 my-6 h-[620px] rounded-xl border bg-muted/40 md:mx-6" />}>
        <AlumniMapClient locations={locations} />
      </ClientOnly>
    </>
  );
}


