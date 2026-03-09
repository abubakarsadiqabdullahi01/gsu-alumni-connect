export type LatLng = {
  latitude: number;
  longitude: number;
};

const STATE_CENTER_COORDS: Record<string, LatLng> = {
  abia: { latitude: 5.532, longitude: 7.486 },
  adamawa: { latitude: 9.2035, longitude: 12.4954 },
  akwaibom: { latitude: 5.036, longitude: 7.912 },
  anambra: { latitude: 6.2104, longitude: 7.0724 },
  bauchi: { latitude: 10.3158, longitude: 9.8442 },
  bayelsa: { latitude: 4.9267, longitude: 6.2676 },
  benue: { latitude: 7.7322, longitude: 8.5391 },
  borno: { latitude: 11.8333, longitude: 13.15 },
  crossriver: { latitude: 4.9517, longitude: 8.322 },
  delta: { latitude: 5.7037, longitude: 6.8008 },
  ebonyi: { latitude: 6.3249, longitude: 8.1137 },
  edo: { latitude: 6.335, longitude: 5.6037 },
  ekiti: { latitude: 7.621, longitude: 5.2215 },
  enugu: { latitude: 6.4584, longitude: 7.5464 },
  gombe: { latitude: 10.2897, longitude: 11.1673 },
  imo: { latitude: 5.485, longitude: 7.035 },
  jigawa: { latitude: 12.2236, longitude: 9.4025 },
  kaduna: { latitude: 10.5105, longitude: 7.4165 },
  kano: { latitude: 12.0022, longitude: 8.592 },
  katsina: { latitude: 12.988, longitude: 7.6008 },
  kebbi: { latitude: 12.4539, longitude: 4.1975 },
  kogi: { latitude: 7.8024, longitude: 6.7333 },
  kwara: { latitude: 8.4966, longitude: 4.5421 },
  lagos: { latitude: 6.5244, longitude: 3.3792 },
  nasarawa: { latitude: 8.4924, longitude: 8.5153 },
  niger: { latitude: 9.6139, longitude: 6.5569 },
  ogun: { latitude: 7.1475, longitude: 3.3619 },
  ondo: { latitude: 7.2508, longitude: 5.2103 },
  osun: { latitude: 7.7706, longitude: 4.5569 },
  oyo: { latitude: 7.3775, longitude: 3.947 },
  plateau: { latitude: 9.8965, longitude: 8.8583 },
  rivers: { latitude: 4.8156, longitude: 7.0498 },
  sokoto: { latitude: 13.0609, longitude: 5.239 },
  taraba: { latitude: 8.8933, longitude: 11.3596 },
  yobe: { latitude: 11.7469, longitude: 11.9608 },
  zamfara: { latitude: 12.1704, longitude: 6.6641 },
  fct: { latitude: 9.0765, longitude: 7.3986 },
};

function normalizeState(state: string) {
  return state
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/state/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function getStateCenter(state: string | null | undefined): LatLng | null {
  if (!state) return null;
  const key = normalizeState(state);
  if (key === "abuja" || key === "federalcapitalterritory") {
    return STATE_CENTER_COORDS.fct;
  }
  return STATE_CENTER_COORDS[key] ?? null;
}
