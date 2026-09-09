/**
 * WCAG 2.1 contrast maths, and the per-role thresholds every theme must clear.
 *
 * Kept dependency-free and DOM-free so it can run in three places: the unit
 * tests, `npm run validate`, and the theme gallery page at build time.
 */

export type Rgb = { r: number; g: number; b: number };

/**
 * Parse the colour syntaxes a theme is allowed to use: `#rgb`, `#rrggbb`, and
 * `rgb()` / `rgba()` in either comma or space form.
 *
 * Returns `null` rather than throwing so callers can report *which* token is
 * malformed. Notably this does not parse `color-mix()` — those are emitted by
 * `defineTheme` for derived tokens and can only be resolved by a browser, so
 * the contrast check skips them (see `isCheckable`).
 */
export function parseColor(value: string): Rgb | null {
  const input = value.trim().toLowerCase();

  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits = hex[1];
    const full =
      digits.length === 3
        ? digits
            .split("")
            .map((d) => d + d)
            .join("")
        : digits;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16)
    };
  }

  const rgb = input.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3);
    if (parts.length !== 3) return null;
    const channels = parts.map((part) =>
      part.endsWith("%") ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part)
    );
    if (channels.some((c) => !Number.isFinite(c) || c < 0 || c > 255)) return null;
    const [r, g, b] = channels;
    return { r, g, b };
  }

  return null;
}

/**
 * A colour only participates in contrast checking if we can resolve it here.
 * `color-mix()` and `var()` references are legal in a theme but opaque to us.
 */
export function isCheckable(value: string): boolean {
  return parseColor(value) !== null;
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

/**
 * WCAG contrast ratio between two colours, from 1 (identical) to 21
 * (black on white). Order does not matter.
 *
 * Throws on unparseable input — callers that might see `color-mix()` should
 * guard with `isCheckable` first.
 */
export function contrastRatio(a: string, b: string): number {
  const colorA = parseColor(a);
  const colorB = parseColor(b);
  if (!colorA || !colorB) {
    throw new Error(`Cannot measure contrast between "${a}" and "${b}".`);
  }
  const [lighter, darker] = [relativeLuminance(colorA), relativeLuminance(colorB)].sort(
    (x, y) => y - x
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether a background reads as dark, used to sanity-check `appearance`. */
export function isDarkBackground(background: string): boolean {
  const parsed = parseColor(background);
  if (!parsed) return false;
  return relativeLuminance(parsed) < 0.18;
}
