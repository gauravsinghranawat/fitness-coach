/** Parse a number typed on a phone keyboard ("74,5" works too). Empty or invalid → null. */
export function parseNum(s: string): number | null {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() === '' || Number.isNaN(n) ? null : n;
}

/** Trim trailing zeros: 60 → "60", 62.5 → "62.5". */
export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—';
  return String(Number(n.toFixed(digits)));
}
