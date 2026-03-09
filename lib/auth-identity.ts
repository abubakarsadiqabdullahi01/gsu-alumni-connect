export function normalizeRegistrationNo(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
