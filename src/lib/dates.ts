const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * `2026-05-12` → `May 12, 2026`.
 *
 * Spelled out by hand rather than through `toLocaleDateString`, so the server
 * render and the browser's hydration always agree: a locale or time zone
 * difference between the two would otherwise shift or reword the date.
 * Anything that is not a full ISO date is returned unchanged.
 */
export function formatDate(iso: string): string;
export function formatDate(iso: string | undefined): string | undefined;
export function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d || m > 12) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
