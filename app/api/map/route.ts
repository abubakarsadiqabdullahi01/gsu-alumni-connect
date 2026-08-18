import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStateCenter } from "@/lib/nigeria-state-centers";
import { isFeatureEnabled } from "@/lib/platform-settings";

type MapPoint = {
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  lga: string | null;
  fullName: string;
  courseCode: string | null;
  facultyCode: string | null;
  graduationYear: string | null;
};

/**
 * Alumni geography for the Android map screen.
 *
 * Mirrors the resolution rules used by the web map page (precise location first,
 * state centroid as fallback) and additionally returns per-state aggregates so
 * the mobile client can draw a bubble map without post-processing.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("featureMap"))) {
      return NextResponse.json(
        { error: "Map feature is disabled by admin." },
        { status: 403 }
      );
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const points: MapPoint[] = [];
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
      points.push({
        latitude,
        longitude,
        city: row.city,
        state,
        lga: row.graduate.lga,
        fullName: row.graduate.fullName,
        courseCode: row.graduate.courseCode,
        facultyCode: row.graduate.facultyCode,
        graduationYear: row.graduate.graduationYear,
      });
    }

    for (const grad of fallbackRows) {
      if (seeded.has(grad.id)) continue;
      const center = getStateCenter(grad.stateOfOrigin);
      if (!center) continue;
      points.push({
        latitude: center.latitude,
        longitude: center.longitude,
        city: null,
        state: grad.stateOfOrigin,
        lga: grad.lga,
        fullName: grad.fullName,
        courseCode: grad.courseCode,
        facultyCode: grad.facultyCode,
        graduationYear: grad.graduationYear,
      });
    }

    const byState = new Map<
      string,
      { state: string; count: number; latitude: number; longitude: number }
    >();

    for (const point of points) {
      const state = point.state?.trim();
      if (!state) continue;
      const existing = byState.get(state);
      if (existing) {
        existing.count += 1;
        continue;
      }
      const center = getStateCenter(state);
      byState.set(state, {
        state,
        count: 1,
        latitude: center?.latitude ?? point.latitude,
        longitude: center?.longitude ?? point.longitude,
      });
    }

    const states = [...byState.values()].sort((a, b) => b.count - a.count);

    return NextResponse.json({
      points,
      states,
      stats: {
        mappedAlumni: points.length,
        statesCovered: states.length,
        topState: states[0]?.state ?? null,
        topStateCount: states[0]?.count ?? 0,
      },
    });
  } catch (error) {
    console.error("[MapAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to load alumni map data." },
      { status: 500 }
    );
  }
}
