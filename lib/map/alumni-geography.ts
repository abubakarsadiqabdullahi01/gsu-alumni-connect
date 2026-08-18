import { prisma } from "@/lib/db";
import { getStateCenter } from "@/lib/nigeria-state-centers";

/**
 * One row per distinct (state, lga, city, faculty, year) combination.
 *
 * This is deliberately an aggregate. Names, ids and precise coordinates never
 * leave the server, so a member cannot read the directory out of the page
 * payload. Counts still compose, which is what lets the client filter and
 * re-aggregate instantly without a round trip per keystroke.
 */
export type GeoFact = {
  state: string;
  lga: string | null;
  city: string | null;
  faculty: string | null;
  year: string | null;
  count: number;
};

/** A drawable bubble: a state we have a centroid for, plus how many alumni sit in it. */
export type StateCluster = {
  state: string;
  count: number;
  latitude: number;
  longitude: number;
};

export type AlumniGeography = {
  facts: GeoFact[];
  states: StateCluster[];
  filters: {
    faculties: string[];
    years: string[];
  };
  stats: {
    /** Alumni we can place as a bubble. */
    mappedAlumni: number;
    /** Alumni counted in the totals but not placeable: no state, or a state with no known centroid. */
    unmappedAlumni: number;
    statesCovered: number;
    topState: string | null;
    topStateCount: number;
  };
};

type NormalisedRow = {
  state: string | null;
  city: string | null;
  lga: string | null;
  faculty: string | null;
  year: string | null;
};

/** Trim to null so "" and "  " collapse into a single bucket rather than several. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Serialised rather than joined by a separator: state, city and LGA names contain
 * spaces and punctuation ("Cross River", "Port Harcourt"), so any single-character
 * separator risks letting distinct combinations collide into one bucket.
 */
function factKey(row: NormalisedRow & { state: string }): string {
  return JSON.stringify([row.state, row.lga, row.city, row.faculty, row.year]);
}

/**
 * Alumni geography for both the web map page and the mobile map screen.
 *
 * Both callers share this so the visibility rules (directory opt-in, active
 * account) and the aggregation can never drift apart between platforms.
 */
export async function getAlumniGeography(): Promise<AlumniGeography> {
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
        graduate: {
          select: {
            id: true,
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
        graduationYear: true,
        facultyCode: true,
        stateOfOrigin: true,
        lga: true,
      },
    }),
  ]);

  const rows: NormalisedRow[] = [];
  const seen = new Set<string>();

  for (const row of locationRows) {
    seen.add(row.graduate.id);
    rows.push({
      // A saved location wins; state of origin is the fallback.
      state: clean(row.state) ?? clean(row.graduate.stateOfOrigin),
      city: clean(row.city),
      lga: clean(row.graduate.lga),
      faculty: clean(row.graduate.facultyCode),
      year: clean(row.graduate.graduationYear),
    });
  }

  for (const grad of fallbackRows) {
    if (seen.has(grad.id)) continue;
    rows.push({
      state: clean(grad.stateOfOrigin),
      city: null,
      lga: clean(grad.lga),
      faculty: clean(grad.facultyCode),
      year: clean(grad.graduationYear),
    });
  }

  const factsByKey = new Map<string, GeoFact>();
  const stateCounts = new Map<string, number>();
  const faculties = new Set<string>();
  const years = new Set<string>();
  let unmappedAlumni = 0;

  for (const row of rows) {
    if (row.faculty) faculties.add(row.faculty);
    if (row.year) years.add(row.year);

    if (!row.state) {
      unmappedAlumni += 1;
      continue;
    }

    const keyed = { ...row, state: row.state };
    const key = factKey(keyed);
    const existing = factsByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      factsByKey.set(key, { ...keyed, count: 1 });
    }

    stateCounts.set(row.state, (stateCounts.get(row.state) ?? 0) + 1);
  }

  const states: StateCluster[] = [];
  for (const [state, count] of stateCounts) {
    const center = getStateCenter(state);
    if (!center) {
      // Still counted in the rankings below, just not drawable as a bubble.
      unmappedAlumni += count;
      continue;
    }
    states.push({ state, count, latitude: center.latitude, longitude: center.longitude });
  }
  states.sort((a, b) => b.count - a.count);

  const facts = [...factsByKey.values()].sort((a, b) => b.count - a.count);
  const mappedAlumni = states.reduce((sum, s) => sum + s.count, 0);

  return {
    facts,
    states,
    filters: {
      faculties: [...faculties].sort(),
      years: [...years].sort((a, b) => b.localeCompare(a)),
    },
    stats: {
      mappedAlumni,
      unmappedAlumni,
      statesCovered: states.length,
      topState: states[0]?.state ?? null,
      topStateCount: states[0]?.count ?? 0,
    },
  };
}
