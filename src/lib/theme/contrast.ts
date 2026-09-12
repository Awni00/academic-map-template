/**
 * WCAG 2.1 contrast maths, and the per-role thresholds every theme must clear.
 *
 * Kept dependency-free and DOM-free so it can run in three places: the unit
 * tests, `npm run validate`, and the theme gallery page at build time.
 */

export type Rgb = { r: number; g: number; b: number };
/** `alpha` runs from 0 (transparent) to 1 (opaque). */
export type Rgba = Rgb & { alpha: number };

/**
 * Parse the colour syntaxes a theme is allowed to use: `#rgb`, `#rgba`,
 * `#rrggbb`, `#rrggbbaa`, and `rgb()` / `rgba()` in either comma or space form.
 *
 * Alpha is kept, not dropped. A translucent colour renders as a blend with
 * whatever is behind it, so measuring its channels as if opaque would pass
 * `rgba(20 20 20 / 0.15)` on white at 18:1 when it actually shows at 1.4:1.
 *
 * Returns `null` rather than throwing so callers can report *which* token is
 * malformed. Notably this does not parse `color-mix()` — those are emitted by
 * `defineTheme` for derived tokens and can only be resolved by a browser, so
 * the contrast check skips them (see `isCheckable`).
 */
export function parseColor(value: string): Rgba | null {
  const input = value.trim().toLowerCase();

  const hex = input.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const digits = hex[1];
    const full =
      digits.length <= 4
        ? digits
            .split("")
            .map((d) => d + d)
            .join("")
        : digits;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
      alpha: full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1
    };
  }

  const rgb = input.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return null;
    const channels = parts
      .slice(0, 3)
      .map((part) =>
        part.endsWith("%") ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part)
      );
    if (channels.some((c) => !Number.isFinite(c) || c < 0 || c > 255)) return null;
    const alphaPart = parts[3];
    const alpha =
      alphaPart === undefined
        ? 1
        : alphaPart.endsWith("%")
          ? Number.parseFloat(alphaPart) / 100
          : Number.parseFloat(alphaPart);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
    const [r, g, b] = channels;
    return { r, g, b, alpha };
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

/** Whether a colour parses and is fully opaque — required of a background. */
export function isOpaque(value: string): boolean {
  return parseColor(value)?.alpha === 1;
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
 * WCAG contrast ratio of `foreground` drawn on `background`, from 1
 * (indistinguishable) to 21 (black on white).
 *
 * A translucent foreground is composited over the background first, so the
 * ratio is the one a reader actually sees. For two opaque colours the order
 * does not matter. The background must be opaque: what shows through a
 * translucent one depends on the page behind it, which is unknowable here.
 *
 * Throws on unparseable input or a translucent background — callers that might
 * see `color-mix()` should guard with `isCheckable` first.
 */
export function contrastRatio(foreground: string, background: string): number {
  const front = parseColor(foreground);
  const back = parseColor(background);
  if (!front || !back) {
    throw new Error(`Cannot measure contrast between "${foreground}" and "${background}".`);
  }
  if (back.alpha < 1) {
    throw new Error(`Cannot measure contrast on translucent background "${background}".`);
  }
  const seen = composite(front, back);
  const [lighter, darker] = [relativeLuminance(seen), relativeLuminance(back)].sort(
    (x, y) => y - x
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blend `front` over an opaque `back`, per channel in sRGB, as browsers paint it. */
function composite(front: Rgba, back: Rgb): Rgb {
  const mix = (top: number, bottom: number) => top * front.alpha + bottom * (1 - front.alpha);
  return { r: mix(front.r, back.r), g: mix(front.g, back.g), b: mix(front.b, back.b) };
}

/** Whether a background reads as dark, used to sanity-check `appearance`. */
export function isDarkBackground(background: string): boolean {
  const parsed = parseColor(background);
  if (!parsed) return false;
  return relativeLuminance(parsed) < 0.18;
}
