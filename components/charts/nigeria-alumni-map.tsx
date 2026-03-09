"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { GraduationCap, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type AlumniLocation = {
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  graduate: {
    fullName: string;
    courseCode: string | null;
    graduationYear: string | null;
  };
};

type TooltipData = {
  state: string;
  count: number;
  x: number;
  y: number;
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoData: any;
  locations: AlumniLocation[];
};

function groupByState(locations: AlumniLocation[]) {
  return locations.reduce<Record<string, AlumniLocation[]>>((acc, loc) => {
    const key = loc.state ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});
}

function getStateCentroids(grouped: Record<string, AlumniLocation[]>) {
  return Object.entries(grouped).map(([state, locs]) => ({
    state,
    count: locs.length,
    coordinates: [
      locs.reduce((sum, l) => sum + l.longitude, 0) / locs.length,
      locs.reduce((sum, l) => sum + l.latitude, 0) / locs.length,
    ] as [number, number],
  }));
}

export function NigeriaAlumniMap({ geoData, locations }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);

  const grouped = useMemo(() => groupByState(locations), [locations]);
  const centroids = useMemo(() => getStateCentroids(grouped), [grouped]);
  const maxCount = Math.max(...centroids.map((c) => c.count), 1);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-cyan-600" />
          <h3 className="text-[13px] font-bold text-slate-800">Alumni Distribution - Nigeria</h3>
        </div>
        <Badge variant="outline" className="border-slate-300 bg-white text-[10px] text-slate-700">
          <Users className="mr-1 size-3" />
          {locations.length.toLocaleString()} alumni located
        </Badge>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [8.6753, 9.082],
          scale: 2800,
        }}
        width={800}
        height={620}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup>
          <Geographies geography={geoData}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const stateName = geo.properties?.state ?? geo.properties?.name ?? "";
                const isActive = activeState === stateName;
                const hasAlumni = Boolean(grouped[stateName]);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isActive ? "hsl(193, 90%, 40%)" : hasAlumni ? "hsl(196, 70%, 76%)" : "hsl(210, 40%, 92%)"}
                    stroke="hsl(212, 22%, 72%)"
                    strokeWidth={0.6}
                    strokeOpacity={0.9}
                    style={{
                      hover: {
                        fill: "hsl(193, 90%, 40%)",
                        cursor: "pointer",
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                      default: { outline: "none" },
                    }}
                    onMouseEnter={(e: any) => {
                      setActiveState(stateName);
                      setTooltip({
                        state: stateName,
                        count: grouped[stateName]?.length ?? 0,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseLeave={() => {
                      setActiveState(null);
                      setTooltip(null);
                    }}
                  />
                );
              })
            }
          </Geographies>

          {centroids.map(({ state, count, coordinates }) => {
            const radius = 4 + (count / maxCount) * 16;
            return (
              <Marker key={state} coordinates={coordinates}>
                <motion.circle
                  r={radius + 4}
                  fill="hsl(178, 86%, 45%)"
                  fillOpacity={0}
                  stroke="hsl(178, 86%, 45%)"
                  strokeWidth={1}
                  strokeOpacity={0.45}
                  animate={{ r: [radius + 2, radius + 10], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.circle
                  r={radius}
                  fill="hsl(178, 86%, 40%)"
                  fillOpacity={0.92}
                  stroke="#ffffff"
                  strokeWidth={2}
                  whileHover={{ scale: 1.3 }}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e: any) =>
                    setTooltip({
                      state,
                      count,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
                {count >= 5 ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-geist-mono)",
                      fill: "#0f172a",
                      fontWeight: "bold",
                      pointerEvents: "none",
                    }}
                  >
                    {count}
                  </text>
                ) : null}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 px-5 py-2.5 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-cyan-500" />
          Alumni cluster (size = count)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[hsl(196,70%,76%)] ring-1 ring-cyan-500/30" />
          State with alumni
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[hsl(210,40%,92%)] ring-1 ring-slate-400/30" />
          No alumni recorded
        </div>
      </div>

      <AnimatePresence>
        {tooltip ? (
          <motion.div
            className="pointer-events-none fixed z-50"
            style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card className="border-cyan-500/30 bg-white shadow-xl">
              <CardContent className="min-w-[140px] p-3">
                <p className="text-[13px] font-bold text-slate-800">{tooltip.state}</p>
                <div className="mt-1 flex items-center gap-1 text-cyan-700">
                  <GraduationCap className="size-3" />
                  <span className="font-mono text-[11px]">{tooltip.count} alumni</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
