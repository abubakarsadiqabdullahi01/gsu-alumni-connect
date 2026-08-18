"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  Filter,
  GraduationCap,
  Layers,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { AlumniGeography, GeoFact } from "@/lib/map/alumni-geography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AlumniTileMap = dynamic(
  () => import("@/components/map/alumni-tile-map").then((m) => m.AlumniTileMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[430px] w-full animate-pulse bg-muted/40 md:h-[520px]" />
    ),
  }
);

const ALL = "all";

type Props = {
  geography: AlumniGeography;
};

type Ranked = { name: string; count: number };

/** Counts are pre-aggregated, so every roll-up sums `count` rather than counting rows. */
function rank(facts: GeoFact[], toKey: (fact: GeoFact) => string | null, limit: number): Ranked[] {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    const key = toKey(fact);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + fact.count);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function AlumniMapClient({ geography }: Props) {
  const [faculty, setFaculty] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [lga, setLga] = useState(ALL);
  const [mapView, setMapView] = useState<"state" | "lga">("state");

  const { facts, filters, stats } = geography;

  const states = useMemo(
    () => [...new Set(facts.map((f) => f.state))].sort(),
    [facts]
  );

  const lgas = useMemo(
    () =>
      [
        ...new Set(
          facts
            .filter((f) => (state === ALL ? true : f.state === state))
            .map((f) => f.lga)
            .filter((v): v is string => Boolean(v))
        ),
      ].sort(),
    [facts, state]
  );

  // Guards against a stale LGA left over from a previous state selection.
  const effectiveLga = lga === ALL || lgas.includes(lga) ? lga : ALL;

  const filtered = useMemo(
    () =>
      facts.filter((fact) => {
        if (faculty !== ALL && fact.faculty !== faculty) return false;
        if (year !== ALL && fact.year !== year) return false;
        if (state !== ALL && fact.state !== state) return false;
        if (effectiveLga !== ALL && fact.lga !== effectiveLga) return false;
        return true;
      }),
    [facts, faculty, year, state, effectiveLga]
  );

  const total = useMemo(() => filtered.reduce((sum, f) => sum + f.count, 0), [filtered]);

  const stateLeaderboard = useMemo(() => rank(filtered, (f) => f.state, 12), [filtered]);
  const cityLeaderboard = useMemo(
    () => rank(filtered, (f) => (f.city ? `${f.city}, ${f.state}` : null), 8),
    [filtered]
  );
  const lgaLeaderboard = useMemo(
    () => rank(filtered, (f) => (f.lga ? `${f.lga}, ${f.state}` : null), 8),
    [filtered]
  );

  const centroidByState = useMemo(() => {
    const map = new Map<string, { latitude: number; longitude: number }>();
    for (const cluster of geography.states) {
      map.set(cluster.state, { latitude: cluster.latitude, longitude: cluster.longitude });
    }
    return map;
  }, [geography.states]);

  // Only states we hold a centroid for can be drawn; the rest still rank below.
  const clusters = useMemo(
    () =>
      rank(filtered, (f) => f.state, Number.MAX_SAFE_INTEGER)
        .map((row) => {
          const centre = centroidByState.get(row.name);
          if (!centre) return null;
          return { state: row.name, count: row.count, ...centre };
        })
        .filter((v): v is { state: string; count: number; latitude: number; longitude: number } =>
          Boolean(v)
        ),
    [filtered, centroidByState]
  );

  const lgaCounts = useMemo(() => rank(filtered, (f) => f.lga, Number.MAX_SAFE_INTEGER), [filtered]);

  const featuredStates = stateLeaderboard.slice(0, 4);
  const activeFilters = [
    faculty !== ALL ? { label: `Faculty: ${faculty}`, clear: () => setFaculty(ALL) } : null,
    year !== ALL ? { label: `Year: ${year}`, clear: () => setYear(ALL) } : null,
    state !== ALL ? { label: `State: ${state}`, clear: () => selectState(ALL) } : null,
    effectiveLga !== ALL ? { label: `LGA: ${effectiveLga}`, clear: () => setLga(ALL) } : null,
  ].filter((v): v is { label: string; clear: () => void } => Boolean(v));

  /** Changing state always clears LGA, whichever control triggered it. */
  function selectState(next: string) {
    setState(next);
    setLga(ALL);
  }

  function resetFilters() {
    setFaculty(ALL);
    setYear(ALL);
    setState(ALL);
    setLga(ALL);
  }

  const selectedStateDetail = useMemo(() => {
    if (state === ALL) return null;
    return {
      state,
      count: total,
      topLgas: rank(filtered, (f) => f.lga, 5),
      topFaculties: rank(filtered, (f) => f.faculty, 5),
      topYears: rank(filtered, (f) => f.year, 5),
    };
  }, [state, total, filtered]);

  return (
    <div className="flex-1 bg-muted/30">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1fr)] lg:items-center lg:py-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            Geographic Coverage
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] text-foreground md:text-5xl">
            Alumni coverage across Nigeria
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
            Explore where GSU old students are represented and compare alumni presence by state,
            faculty, graduation set or LGA.
          </p>
          <p className="mt-4 inline-flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Coverage is aggregated by state before it leaves the server. No individual address or
              coordinate is shared with other members.
            </span>
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {featuredStates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-5 py-6 text-sm text-muted-foreground sm:col-span-2">
                No alumni match the current filters.
              </p>
            ) : (
              featuredStates.map((row) => {
                const active = state === row.name;
                return (
                  <button
                    key={row.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectState(active ? ALL : row.name)}
                    className={`group flex min-h-16 items-center justify-between rounded-lg border border-t-4 bg-card px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "border-primary border-t-primary ring-2 ring-primary/30"
                        : "border-border border-t-primary hover:border-primary/50"
                    }`}
                  >
                    <span>
                      <span className="block text-base font-extrabold text-foreground">
                        {row.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {row.count.toLocaleString()} alumni
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      {active ? "Clear" : "Focus"}
                      {active ? <X className="size-3.5" /> : <Filter className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
          <AlumniTileMap clusters={clusters} lgaCounts={lgaCounts} viewMode={mapView} />
          {total === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 p-6 text-center">
              <div>
                <MapPin className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold text-foreground">No alumni found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try clearing a filter to widen the search.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-6 md:grid-cols-3 md:px-6">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Visible Alumni</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-foreground">
            <UsersRound className="size-6 text-primary" />
            {total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Top State</p>
          <p className="mt-2 text-xl font-extrabold text-foreground">
            {stateLeaderboard[0]?.name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {(stateLeaderboard[0]?.count ?? 0).toLocaleString()} alumni
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">States Covered</p>
          <p className="mt-2 text-3xl font-black text-foreground">{stateLeaderboard.length}</p>
          {stats.unmappedAlumni > 0 ? (
            <p className="text-xs text-muted-foreground">
              {stats.unmappedAlumni.toLocaleString()} without mappable location
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6 md:px-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Refine alumni coverage</CardTitle>
            <CardDescription>
              Use structured filters to focus the map and state rankings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={faculty} onValueChange={setFaculty}>
                <SelectTrigger aria-label="Faculty">
                  <SelectValue placeholder="Faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Faculties</SelectItem>
                  {filters.faculties.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger aria-label="Graduation year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Years</SelectItem>
                  {filters.years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={state} onValueChange={selectState}>
                <SelectTrigger aria-label="State">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All States</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={effectiveLga} onValueChange={setLga} disabled={lgas.length === 0}>
                <SelectTrigger aria-label="Local government area">
                  <SelectValue placeholder="LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All LGAs</SelectItem>
                  {lgas.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-auto flex items-center gap-1 rounded-md border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mapView === "state" ? "default" : "ghost"}
                  aria-pressed={mapView === "state"}
                  onClick={() => setMapView("state")}
                >
                  <MapPin className="size-3.5" />
                  State clusters
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mapView === "lga" ? "default" : "ghost"}
                  aria-pressed={mapView === "lga"}
                  onClick={() => setMapView("lga")}
                >
                  <Layers className="size-3.5" />
                  LGA polygons
                </Button>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                {total.toLocaleString()} results
              </span>

              {activeFilters.length > 0 ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              ) : null}
            </div>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.clear}
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                    <X className="size-3" />
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {selectedStateDetail ? (
        <div className="mx-auto max-w-7xl px-4 pb-6 md:px-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{selectedStateDetail.state}</CardTitle>
              <CardDescription>
                {selectedStateDetail.count.toLocaleString()} alumni match the current filters.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Top LGAs", rows: selectedStateDetail.topLgas },
                { title: "Top faculties", rows: selectedStateDetail.topFaculties },
                { title: "Graduation sets", rows: selectedStateDetail.topYears },
              ].map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {group.rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No data.</p>
                    ) : (
                      group.rows.map((row) => (
                        <div key={row.name} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{row.name}</span>
                          <Badge variant="secondary">{row.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 md:px-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Coverage by state</CardTitle>
            <CardDescription>
              Ranking of alumni records currently visible on the map.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stateLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records in this filter.</p>
            ) : (
              stateLeaderboard.map((row, idx) => (
                <button
                  key={row.name}
                  type="button"
                  onClick={() => selectState(state === row.name ? ALL : row.name)}
                  aria-pressed={state === row.name}
                  className="w-full rounded-md p-1 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{row.name}</span>
                    </div>
                    <Badge variant="secondary">{row.count}</Badge>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: total > 0 ? `${(row.count / total) * 100}%` : "0%" }}
                    />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            { title: "Top Cities", rows: cityLeaderboard, empty: "No city data available." },
            { title: "Top LGAs", rows: lgaLeaderboard, empty: "No LGA data available." },
          ].map((group) => (
            <Card key={group.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{group.empty}</p>
                ) : (
                  group.rows.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        <span>{row.name}</span>
                      </div>
                      <Badge variant="outline">{row.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="grid grid-cols-3 gap-2 p-4">
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <UsersRound className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold text-foreground">{total.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Alumni</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <Building2 className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold text-foreground">{filters.faculties.length}</p>
                <p className="text-[10px] text-muted-foreground">Faculties</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2 text-center">
                <GraduationCap className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-lg font-bold text-foreground">{filters.years.length}</p>
                <p className="text-[10px] text-muted-foreground">Year Sets</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
