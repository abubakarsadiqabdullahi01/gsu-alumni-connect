"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Building2, Filter, GraduationCap, MapPin, Users, UsersRound } from "lucide-react";
import type { AlumniLocation } from "@/components/charts/nigeria-alumni-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AlumniTileMap = dynamic(
  () => import("@/components/map/alumni-tile-map").then((m) => m.AlumniTileMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[620px] w-full animate-pulse rounded-xl border bg-muted/40" />
    ),
  }
);

type MapAlumniLocation = AlumniLocation & {
  lga: string | null;
  graduate: AlumniLocation["graduate"] & {
    facultyCode: string | null;
  };
};

type Props = {
  locations: MapAlumniLocation[];
};

export function AlumniMapClient({ locations }: Props) {
  const [faculty, setFaculty] = useState("all");
  const [year, setYear] = useState("all");
  const [state, setState] = useState("all");
  const [lga, setLga] = useState("all");
  const [mapView, setMapView] = useState<"state" | "lga">("state");

  const faculties = useMemo(
    () =>
      Array.from(new Set(locations.map((l) => l.graduate.facultyCode).filter((v): v is string => Boolean(v)))).sort(),
    [locations]
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(locations.map((l) => l.graduate.graduationYear).filter((v): v is string => Boolean(v)))
      ).sort((a, b) => b.localeCompare(a)),
    [locations]
  );

  const states = useMemo(
    () => Array.from(new Set(locations.map((l) => l.state).filter((v): v is string => Boolean(v)))).sort(),
    [locations]
  );

  const lgas = useMemo(
    () =>
      Array.from(
        new Set(
          locations
            .filter((l) => (state === "all" ? true : l.state === state))
            .map((l) => l.lga)
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [locations, state]
  );

  useEffect(() => {
    if (lga === "all") return;
    if (!lgas.includes(lga)) {
      setLga("all");
    }
  }, [lgas, lga]);

  const filtered = useMemo(
    () =>
      locations.filter((loc) => {
        if (faculty !== "all" && loc.graduate.facultyCode !== faculty) return false;
        if (year !== "all" && loc.graduate.graduationYear !== year) return false;
        if (state !== "all" && loc.state !== state) return false;
        if (lga !== "all" && loc.lga !== lga) return false;
        return true;
      }),
    [locations, faculty, year, state, lga]
  );

  const stateLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of filtered) {
      const key = loc.state ?? "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filtered]);

  const cityLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of filtered) {
      const key = `${loc.city ?? "Unknown City"}, ${loc.state ?? "Unknown"}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  const lgaLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of filtered) {
      if (!loc.lga) continue;
      const key = `${loc.lga}${loc.state ? `, ${loc.state}` : ""}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  const total = filtered.length;
  const topStateCount = stateLeaderboard[0]?.count ?? 0;
  const topStateName = stateLeaderboard[0]?.name ?? "N/A";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <Card className="overflow-hidden border-primary/20">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Alumni Location Intelligence</CardTitle>
          <CardDescription>
            Explore verified alumni presence across Nigeria with live filters by faculty, year, and state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Visible Alumni</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <UsersRound className="size-5 text-primary" />
              {total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Top State</p>
            <p className="mt-1 text-base font-semibold">{topStateName}</p>
            <p className="text-xs text-muted-foreground">{topStateCount.toLocaleString()} alumni</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">States Covered</p>
            <p className="mt-1 text-2xl font-bold">{stateLeaderboard.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_220px_auto]">
          <Select value={faculty} onValueChange={setFaculty}>
            <SelectTrigger>
              <SelectValue placeholder="Faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculties</SelectItem>
              {faculties.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lga} onValueChange={setLga}>
            <SelectTrigger>
              <SelectValue placeholder="LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {lgas.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mapView} onValueChange={(v) => setMapView(v as "state" | "lga")}>
            <SelectTrigger>
              <SelectValue placeholder="Map Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="state">State Clusters</SelectItem>
              <SelectItem value="lga">LGA Polygons Only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-center rounded-md border px-3 text-xs text-muted-foreground">
            <Filter className="mr-1.5 size-3.5" />
            {total.toLocaleString()} results
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <AlumniTileMap locations={filtered} viewMode={mapView} />

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stateLeaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">No records in this filter.</p>
              ) : (
                stateLeaderboard.map((row, idx) => (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded bg-muted font-semibold">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{row.name}</span>
                      </div>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.round((row.count / total) * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Cities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cityLeaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">No city data available.</p>
              ) : (
                cityLeaderboard.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="size-3.5 text-primary" />
                      <span>{row.name}</span>
                    </div>
                    <Badge variant="outline">{row.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top LGAs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lgaLeaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">No LGA data available.</p>
              ) : (
                lgaLeaderboard.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="size-3.5 text-primary" />
                      <span>{row.name}</span>
                    </div>
                    <Badge variant="outline">{row.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-3 gap-2 p-4">
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <Users className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold">{total}</p>
                <p className="text-[10px] text-muted-foreground">Alumni</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <Building2 className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold">{faculties.length}</p>
                <p className="text-[10px] text-muted-foreground">Faculties</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <GraduationCap className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold">{years.length}</p>
                <p className="text-[10px] text-muted-foreground">Year Sets</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
