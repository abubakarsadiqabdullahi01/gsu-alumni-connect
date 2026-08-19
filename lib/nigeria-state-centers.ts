export type LatLng = {
  latitude: number;
  longitude: number;
};

type StateEntry = LatLng & { name: string };

/**
 * Keyed by normalised name; `name` is the form shown to users.
 *
 * Records come from spreadsheets filled in by hand over many years, so the same
 * state arrives as "GOMBE", "Gombe", "GOM" and "GM". Everything resolves
 * through [canonicalStateName] so those rank as one state rather than four.
 */
const STATES: Record<string, StateEntry> = {
  abia: { name: "Abia", latitude: 5.532, longitude: 7.486 },
  adamawa: { name: "Adamawa", latitude: 9.2035, longitude: 12.4954 },
  akwaibom: { name: "Akwa Ibom", latitude: 5.036, longitude: 7.912 },
  anambra: { name: "Anambra", latitude: 6.2104, longitude: 7.0724 },
  bauchi: { name: "Bauchi", latitude: 10.3158, longitude: 9.8442 },
  bayelsa: { name: "Bayelsa", latitude: 4.9267, longitude: 6.2676 },
  benue: { name: "Benue", latitude: 7.7322, longitude: 8.5391 },
  borno: { name: "Borno", latitude: 11.8333, longitude: 13.15 },
  crossriver: { name: "Cross River", latitude: 4.9517, longitude: 8.322 },
  delta: { name: "Delta", latitude: 5.7037, longitude: 6.8008 },
  ebonyi: { name: "Ebonyi", latitude: 6.3249, longitude: 8.1137 },
  edo: { name: "Edo", latitude: 6.335, longitude: 5.6037 },
  ekiti: { name: "Ekiti", latitude: 7.621, longitude: 5.2215 },
  enugu: { name: "Enugu", latitude: 6.4584, longitude: 7.5464 },
  gombe: { name: "Gombe", latitude: 10.2897, longitude: 11.1673 },
  imo: { name: "Imo", latitude: 5.485, longitude: 7.035 },
  jigawa: { name: "Jigawa", latitude: 12.2236, longitude: 9.4025 },
  kaduna: { name: "Kaduna", latitude: 10.5105, longitude: 7.4165 },
  kano: { name: "Kano", latitude: 12.0022, longitude: 8.592 },
  katsina: { name: "Katsina", latitude: 12.988, longitude: 7.6008 },
  kebbi: { name: "Kebbi", latitude: 12.4539, longitude: 4.1975 },
  kogi: { name: "Kogi", latitude: 7.8024, longitude: 6.7333 },
  kwara: { name: "Kwara", latitude: 8.4966, longitude: 4.5421 },
  lagos: { name: "Lagos", latitude: 6.5244, longitude: 3.3792 },
  nasarawa: { name: "Nasarawa", latitude: 8.4924, longitude: 8.5153 },
  niger: { name: "Niger", latitude: 9.6139, longitude: 6.5569 },
  ogun: { name: "Ogun", latitude: 7.1475, longitude: 3.3619 },
  ondo: { name: "Ondo", latitude: 7.2508, longitude: 5.2103 },
  osun: { name: "Osun", latitude: 7.7706, longitude: 4.5569 },
  oyo: { name: "Oyo", latitude: 7.3775, longitude: 3.947 },
  plateau: { name: "Plateau", latitude: 9.8965, longitude: 8.8583 },
  rivers: { name: "Rivers", latitude: 4.8156, longitude: 7.0498 },
  sokoto: { name: "Sokoto", latitude: 13.0609, longitude: 5.239 },
  taraba: { name: "Taraba", latitude: 8.8933, longitude: 11.3596 },
  yobe: { name: "Yobe", latitude: 11.7469, longitude: 11.9608 },
  zamfara: { name: "Zamfara", latitude: 12.1704, longitude: 6.6641 },
  fct: { name: "FCT", latitude: 9.0765, longitude: 7.3986 },
};

/**
 * Abbreviations and misspellings observed in imported records.
 *
 * Case and punctuation are handled by [normalizeKey], so only genuinely
 * different spellings belong here. Extend it as new variants surface — an
 * unrecognised value is kept and shown rather than dropped, so it stays
 * visible until someone adds it or corrects the source record.
 */
const STATE_ALIASES: Record<string, string> = {
  abuja: "fct",
  federalcapital: "fct",
  federalcapitalterritory: "fct",
  fctabuja: "fct",
  // Truncated in the graduation spreadsheets.
  gom: "gombe",
  gm: "gombe",
  // Frequent misspellings.
  nassarawa: "nasarawa",
  crossrivers: "crossriver",
  akwaibiom: "akwaibom",
};

/** Strips case, punctuation, digits and a trailing "state". */
function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/state/g, "")
    .replace(/[^a-z]/g, "");
}

function resolveKey(state: string | null | undefined): string | null {
  if (!state) return null;
  const key = normalizeKey(state);
  if (!key) return null;
  const resolved = STATE_ALIASES[key] ?? key;
  return resolved in STATES ? resolved : null;
}

export function getStateCenter(state: string | null | undefined): LatLng | null {
  const key = resolveKey(state);
  if (!key) return null;
  const { latitude, longitude } = STATES[key];
  return { latitude, longitude };
}

/**
 * The display name for any recognised spelling, or null when the value is not
 * a state we know. Callers decide whether to fall back to the raw text.
 */
export function canonicalStateName(state: string | null | undefined): string | null {
  const key = resolveKey(state);
  return key ? STATES[key].name : null;
}
