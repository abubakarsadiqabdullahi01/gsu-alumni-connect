"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON as GeoJsonLayer, MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Layer } from "leaflet";
import { Badge } from "@/components/ui/badge";

export type MapCluster = {
  state: string;
  count: number;
  latitude: number;
  longitude: number;
};

export type LgaCount = {
  name: string;
  count: number;
};

type Props = {
  clusters: MapCluster[];
  lgaCounts: LgaCount[];
  viewMode: "state" | "lga";
};

type LgaFeatureProperties = {
  shapeName?: string;
};

type LgaGeoJson = GeoJSON.FeatureCollection<GeoJSON.Geometry, LgaFeatureProperties>;

type BoundaryStatus = "idle" | "loading" | "ready" | "error";

/** Served from our own origin and cached, rather than fetched from a third party per visitor. */
const LGA_BOUNDARIES_URL = "/api/map/lga-boundaries";

/** Module constant: rebuilding this per render hands Leaflet a new identity every time. */
const NIGERIA_BOUNDS: [[number, number], [number, number]] = [
  [4.2, 2.6],
  [13.95, 14.9],
];

const NIGERIA_CENTRE: [number, number] = [9.082, 8.6753];

/**
 * Tailwind classes carry the theme colour so the map follows light/dark mode;
 * the literal colours below are the fallback if those utilities are unavailable,
 * since CSS wins over Leaflet's presentation attributes.
 */
const PATH_CLASS = "stroke-primary fill-primary";
const FALLBACK_STROKE = "#0e7490";
const FALLBACK_FILL = "#06b6d4";

function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function AlumniTileMap({ clusters, lgaCounts, viewMode }: Props) {
  const [lgaGeoData, setLgaGeoData] = useState<LgaGeoJson | null>(null);
  const [status, setStatus] = useState<BoundaryStatus>("idle");

  // Only pay for the boundary download if the user actually opens LGA mode.
  useEffect(() => {
    if (viewMode !== "lga" || lgaGeoData || status === "loading" || status === "error") return;

    let ignore = false;
    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(LGA_BOUNDARIES_URL);
        if (!res.ok) throw new Error(`Boundary request failed: ${res.status}`);
        const json = (await res.json()) as LgaGeoJson;
        if (ignore) return;
        setLgaGeoData(json);
        setStatus("ready");
      } catch {
        if (!ignore) setStatus("error");
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [viewMode, lgaGeoData, status]);

  const maxCount = useMemo(
    () => Math.max(...clusters.map((c) => c.count), 1),
    [clusters]
  );

  const lgaCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of lgaCounts) {
      const key = normalizeName(row.name);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + row.count);
    }
    return map;
  }, [lgaCounts]);

  const maxLgaCount = useMemo(() => Math.max(...lgaCountMap.values(), 1), [lgaCountMap]);

  return (
    <div className="relative">
      <div className="relative h-[430px] w-full md:h-[520px]">
        <MapContainer
          center={NIGERIA_CENTRE}
          zoom={6}
          minZoom={6}
          maxZoom={12}
          maxBounds={NIGERIA_BOUNDS}
          maxBoundsViscosity={1}
          // Off deliberately: the map sits inside a long page, and wheel-zoom
          // would swallow the scroll every time the cursor crossed it.
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {viewMode === "lga" && lgaGeoData ? (
            <GeoJsonLayer
              data={lgaGeoData}
              style={(feature) => {
                const count = lgaCountMap.get(normalizeName(feature?.properties?.shapeName)) ?? 0;
                return {
                  className: PATH_CLASS,
                  color: FALLBACK_STROKE,
                  fillColor: FALLBACK_FILL,
                  weight: count > 0 ? 1.1 : 0.5,
                  fillOpacity: count > 0 ? Math.max(0.15, count / maxLgaCount) : 0.05,
                };
              }}
              onEachFeature={(feature, layer: Layer) => {
                const lgaName = feature?.properties?.shapeName ?? "Unknown LGA";
                const count = lgaCountMap.get(normalizeName(lgaName)) ?? 0;
                layer.bindTooltip(
                  `${lgaName}: ${count.toLocaleString()} ${count === 1 ? "alumnus" : "alumni"}`,
                  { sticky: true }
                );
              }}
            />
          ) : null}

          {viewMode === "state"
            ? clusters.map((cluster) => (
                <CircleMarker
                  key={cluster.state}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={8 + (cluster.count / maxCount) * 16}
                  pathOptions={{
                    className: PATH_CLASS,
                    color: FALLBACK_STROKE,
                    fillColor: FALLBACK_FILL,
                    weight: 2,
                    fillOpacity: 0.55,
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{cluster.state}</p>
                      <Badge variant="secondary">
                        {cluster.count.toLocaleString()} alumni
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Aggregated at state level.
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            : null}
        </MapContainer>
      </div>

      {viewMode === "lga" && status === "loading" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/90 px-4 py-2 text-center text-xs text-muted-foreground">
          Loading LGA boundaries…
        </div>
      ) : null}

      {viewMode === "lga" && status === "error" ? (
        <div className="absolute inset-x-0 bottom-0 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          LGA boundaries could not be loaded. State clusters still work.
        </div>
      ) : null}

      <p className="border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        Use the + and − controls to zoom. Bubble size reflects the number of alumni in each state.
      </p>
    </div>
  );
}
