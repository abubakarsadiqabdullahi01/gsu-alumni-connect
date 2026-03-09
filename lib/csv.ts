export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text =
    value instanceof Date ? value.toISOString() : String(value);
  const escaped = text.replace(/"/g, "\"\"");

  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

