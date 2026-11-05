/** Today's date in the phone's time zone, as YYYY-MM-DD (what the `date` columns store). */
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "Thu, 5 Nov" from a YYYY-MM-DD string, without time-zone shifts. */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Add days to a YYYY-MM-DD string, staying in local time. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

/** "Today", "Yesterday" or "Thu, 5 Nov". */
export function relativeDate(iso: string): string {
  const today = localDate();
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return shortDate(iso);
}

/** 95 → "1:35". */
export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
