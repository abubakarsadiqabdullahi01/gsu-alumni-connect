"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Layer } from "leaflet";
import { Badge } from "@/components/ui/badge";

type MapAlumniLocation = {
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

type Cluster = {
  state: string;
  count: number;
  center: [number, number];
  sampleNames: string[];
  topLgas: string[];
};

type Props = {
  locations: MapAlumniLocation[];
  viewMode: "state" | "lga";
};

type LgaFeatureProperties = {
  shapeName?: string;
};

type LgaGeoJson = GeoJSON.FeatureCollection<GeoJSON.Geometry, LgaFeatureProperties>;

const NIGERIA_LGA_SIMPLIFIED_GEOJSON_URL =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2_simplified.geojson";

function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildClusters(locations: MapAlumniLocation[]): Cluster[] {
  const grouped = new Map<string, MapAlumniLocation[]>();
  for (const loc of locations) {
    const key = loc.state ?? "Unknown";
    const arr = grouped.get(key) ?? [];
    arr.push(loc);
    grouped.set(key, arr);
  }

  return [...grouped.entries()].map(([state, rows]) => {
    const lat = rows.reduce((sum, r) => sum + r.latitude, 0) / rows.length;
    const lng = rows.reduce((sum, r) => sum + r.longitude, 0) / rows.length;
    return {
      state,
      count: rows.length,
      center: [lat, lng],
      sampleNames: rows.slice(0, 3).map((r) => r.graduate.fullName),
      topLgas: [...rows.reduce((acc, row) => {
        if (!row.lga) return acc;
        acc.set(row.lga, (acc.get(row.lga) ?? 0) + 1);
        return acc;
      }, new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    };
  });
}

export function AlumniTileMap({ locations, viewMode }: Props) {
  const clusters = useMemo(() => buildClusters(locations), [locations]);
  const maxCount = Math.max(...clusters.map((c) => c.count), 1);
  const [lgaGeoData, setLgaGeoData] = useState<LgaGeoJson | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(NIGERIA_LGA_SIMPLIFIED_GEOJSON_URL);
        if (!res.ok) return;
        const json = (await res.json()) as LgaGeoJson;
        if (!ignore) setLgaGeoData(json);
      } catch {
        // Keep map functional even if polygon dataset fails.
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const lgaCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const loc of locations) {
      const key = normalizeName(loc.lga);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [locations]);

  const maxLgaCount = useMemo(() => Math.max(...lgaCountMap.values(), 1), [lgaCountMap]);

  const nigeriaBounds: [[number, number], [number, number]] = [
    [4.2, 2.6],
    [13.95, 14.9],
  ];

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="relative h-[620px] w-full">
        <MapContainer
          center={[9.082, 8.6753]}
          zoom={6}
          minZoom={6}
          maxZoom={12}
          maxBounds={nigeriaBounds}
          maxBoundsViscosity={1}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {lgaGeoData && viewMode === "lga" ? (
            <GeoJSON
              data={lgaGeoData}
              style={(feature) => {
                const lgaName = feature?.properties?.shapeName ?? "";
                const count = lgaCountMap.get(normalizeName(lgaName)) ?? 0;
                const intensity = count > 0 ? Math.max(0.15, count / maxLgaCount) : 0.05;
                return {
                  color: "#0f766e",
                  weight: count > 0 ? 1.1 : 0.5,
                  fillColor: "#14b8a6",
                  fillOpacity: intensity,
                };
              }}
              onEachFeature={(feature, layer: Layer) => {
                const lgaName = feature?.properties?.shapeName ?? "Unknown LGA";
                const count = lgaCountMap.get(normalizeName(lgaName)) ?? 0;
                layer.bindTooltip(`${lgaName}: ${count} alumni`, {
                  sticky: true,
                });
              }}
            />
          ) : null}

          {viewMode === "state"
            ? clusters.map((cluster) => {
                const radius = 8 + (cluster.count / maxCount) * 16;
                return (
                  <CircleMarker
                    key={cluster.state}
                    center={cluster.center}
                    radius={radius}
                    pathOptions={{
                      color: "#0e7490",
                      weight: 2,
                      fillColor: "#06b6d4",
                      fillOpacity: 0.55,
                    }}
                  >
                    <Popup>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">{cluster.state}</p>
                        <Badge variant="secondary">{cluster.count} alumni</Badge>
                        {cluster.topLgas.length > 0 ? (
                          <p className="text-xs text-muted-foreground">Top LGAs: {cluster.topLgas.join(", ")}</p>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          {cluster.sampleNames.map((name) => (
                            <p key={name}>{name}</p>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })
            : null}
        </MapContainer>
      </div>
    </div>
  );
}
