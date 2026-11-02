import type { Theme, ThemeAppearance, ThemeColors } from "../../config/types";
import { contrastRatio, isCheckable, mixSrgb } from "./contrast";
import { deltaE, deltaECvd, oklch, oklchToHex } from "./perception";

/**
 * The colours `<Chart>` and `<Diagram>` draw with, as theme roles.
 *
 * Six categorical slots in a fixed order (`figure-1` … `figure-6`), a
 * companion shade of each (`figure-N-alt`, for a series closely related to
 * slot N, such as a model and its ablation) and a neutral for baselines and
 * reference lines. They are emitted as `--figure-*` custom properties, which
 * `figures.css` reads; nothing else in the figure system names a colour.
 *
 * A theme states the six slots. The companions and the neutral are derived
 * when left out, by the rules below, and a theme that states none of them
 * gets `FALLBACK_SERIES` fitted to its background. All of it is checked by
 * `checkFigureColors`, so a palette that cannot be told apart fails
 * `npm run validate` like unreadable text does.
 */

export const FIGURE_SERIES_TOKENS = [
  "figure-1",
  "figure-2",
  "figure-3",
  "figure-4",
  "figure-5",
  "figure-6"
] as const;

export const FIGURE_ALT_TOKENS = [
  "figure-1-alt",
  "figure-2-alt",
  "figure-3-alt",
  "figure-4-alt",
  "figure-5-alt",
  "figure-6-alt"
] as const;

export type FigureColorToken =
  | (typeof FIGURE_SERIES_TOKENS)[number]
  | (typeof FIGURE_ALT_TOKENS)[number]
  | "figure-neutral";

export const FIGURE_COLOR_TOKENS: readonly FigureColorToken[] = [
  ...FIGURE_SERIES_TOKENS,
  ...FIGURE_ALT_TOKENS,
  "figure-neutral"
];

/**
 * How figures mix their colours, per appearance. These are not colours, so a
 * theme does not set them; `themeToCss` emits them next to the palette.
 *
 * - `tint`: a diagram region's fill, `tint`% of its tone over the page.
 * - `strong`: a labelled block's fill, `color-mix(in srgb, tone strong%, black)`,
 *   dark enough for white text. Dark themes' tones are lighter, so they are
 *   darkened further.
 * - `band`: the opacity of a chart's area marks (confidence bands).
 */
export const FIGURE_MIX: Record<ThemeAppearance, { tint: number; strong: number; band: number }> = {
  light: { tint: 26, strong: 82, band: 0.14 },
  dark: { tint: 34, strong: 64, band: 0.18 }
};

/** What every figure palette must clear. */
export const FIGURE_TARGETS = {
  /** Each series, companion and the neutral against `bg`: WCAG's 3:1 for graphics. */
  contrast: 3,
  /**
   * Adjacent slots under simulated protanopia and deuteranopia (OKLab ΔE ×100).
   * Below `cvdFloor` is an error; between floor and target is a warning, as the
   * pair is then only safe with a second encoding (a dash, a direct label).
   */
  cvdTarget: 8,
  cvdFloor: 6,
  /** Adjacent slots under normal vision: full-colour readers must tell neighbours apart too. */
  normal: 15,
  /** A companion against its own slot, normal vision. Advisory. */
  alt: 10,
  /** White text on a `strong` fill: WCAG AA for text. */
  strongText: 4.5
} as const;

/** Margin the derivations aim for, so a derived colour does not sit exactly on a limit. */
const ALT_PALE_CONTRAST = 3.2;
/** How far a deepened companion moves from its slot (OKLab ΔE ×100). */
const ALT_DEEP_DISTANCE = 16;
const SLOT_CONTRAST = 3.2;

/**
 * Slots for a theme that states none, per appearance. Blue, ochre, teal,
 * violet, green, red: the order that keeps neighbours apart for red–green
 * colour-blind readers. Each is moved toward `fg` if the theme's background
 * leaves it under 3:1 (see `fitFigureSlot`).
 */
export const FALLBACK_SERIES: Record<ThemeAppearance, readonly string[]> = {
  light: ["#2c5cc5", "#9d6d03", "#00877d", "#8a5bc4", "#208744", "#9b1f1c"],
  dark: ["#8ea7ff", "#d5a049", "#4ec3da", "#b37ee9", "#53cd7c", "#e36364"]
};

/** `base` moved toward `toward` in 1% steps until `done` accepts it. */
function stepToward(base: string, toward: string, done: (c: string) => boolean): string {
  let current = base;
  for (let t = 0; t <= 100; t += 1) {
    const candidate = mixSrgb(base, toward, t);
    if (candidate === null) return base;
    current = candidate;
    if (done(candidate)) return candidate;
  }
  return current;
}

/**
 * A fallback slot (or the neutral) fitted to a theme: unchanged unless it
 * misses 3:1 on `bg` or, in a light theme, would leave white text on its
 * strong fill under 4.5:1; then moved toward `fg` until it clears both.
 */
export function fitFigureSlot(
  slot: string,
  bg: string,
  fg: string,
  appearance: ThemeAppearance
): string {
  if (!isCheckable(slot) || !isCheckable(bg) || !isCheckable(fg)) return slot;
  return stepToward(slot, fg, (c) => {
    if (contrastRatio(c, bg) < SLOT_CONTRAST) return false;
    // Moving a dark theme's colour toward `fg` lightens its strong fill, so
    // only a light theme can fix that this way.
    const fill = strongFill(c, appearance);
    return appearance === "dark" || (fill !== null && contrastRatio("#ffffff", fill) >= FIGURE_TARGETS.strongText);
  });
}

/**
 * A slot's companion shade: same hue, clearly different lightness, still at
 * least 3:1 on the page.
 *
 * A slot with room above 3:1 is paled toward `bg` until it nears 3:1. A slot
 * already close to 3:1, or one that paling would not move far enough to tell
 * apart, is deepened instead: its OKLCH lightness is stepped toward `fg`'s,
 * hue and chroma held, until it is ΔE 16 from the slot. (Mixing toward `fg`
 * would grey it out.)
 */
export function deriveFigureAlt(slot: string, bg: string, fg: string): string {
  if (!isCheckable(slot) || !isCheckable(bg) || !isCheckable(fg)) {
    return `color-mix(in srgb, ${slot} 60%, ${fg})`;
  }
  if (contrastRatio(slot, bg) >= 4.5) {
    let pale = slot;
    for (let t = 1; t <= 90; t += 1) {
      const candidate = mixSrgb(slot, bg, t)!;
      if (contrastRatio(candidate, bg) < ALT_PALE_CONTRAST) break;
      pale = candidate;
    }
    if (deltaE(pale, slot) >= 12) return pale;
  }
  const [L, C, h] = oklch(slot);
  const direction = oklch(fg)[0] > L ? 1 : -1;
  let deep = slot;
  for (let step = 1; step <= 100; step += 1) {
    const lightness = L + direction * step * 0.005;
    if (lightness <= 0 || lightness >= 1) break;
    deep = oklchToHex(lightness, C, h);
    if (deltaE(deep, slot) >= ALT_DEEP_DISTANCE && contrastRatio(deep, bg) >= ALT_PALE_CONTRAST) break;
  }
  return deep;
}

/**
 * The seven figure roles a theme resolves to, filling whatever `colors` leaves
 * out. Used by `defineTheme`.
 */
export function resolveFigureColors(
  colors: Partial<ThemeColors>,
  appearance: ThemeAppearance,
  bg: string,
  fg: string,
  neutral: string
): Pick<ThemeColors, FigureColorToken> {
  const resolved = {} as Pick<ThemeColors, FigureColorToken>;
  FIGURE_SERIES_TOKENS.forEach((token, i) => {
    const slot = colors[token] ?? fitFigureSlot(FALLBACK_SERIES[appearance][i], bg, fg, appearance);
    resolved[token] = slot;
    resolved[FIGURE_ALT_TOKENS[i]] = colors[FIGURE_ALT_TOKENS[i]] ?? deriveFigureAlt(slot, bg, fg);
  });
  resolved["figure-neutral"] = colors["figure-neutral"] ?? fitFigureSlot(neutral, bg, fg, appearance);
  return resolved;
}

/** The fill behind white text in a diagram block, as `figures.css` mixes it. */
export const strongFill = (tone: string, appearance: ThemeAppearance) =>
  mixSrgb(tone, "#000000", 100 - FIGURE_MIX[appearance].strong);

export type FigureIssue = { token: string; message: string; severity: "error" | "warning" };

/**
 * The figure palette checks, for one theme. `checkTheme` folds these into its
 * report; they are separate so the tests and the docs can name them.
 */
export function checkFigureColors(theme: Theme): FigureIssue[] {
  const issues: FigureIssue[] = [];
  const { colors, appearance } = theme;
  const bg = colors.bg;
  const error = (token: string, message: string) => issues.push({ token, message, severity: "error" });
  const warn = (token: string, message: string) => issues.push({ token, message, severity: "warning" });

  for (const token of FIGURE_COLOR_TOKENS) {
    const value = colors[token];
    if (!isCheckable(value)) {
      warn(token, `"${value}" cannot be checked; verify it by eye`);
      continue;
    }
    const ratio = contrastRatio(value, bg);
    if (ratio < FIGURE_TARGETS.contrast) {
      error(token, `${value} on ${bg} is ${ratio.toFixed(2)}:1, below the ${FIGURE_TARGETS.contrast}:1 required`);
    }
  }

  for (let i = 0; i + 1 < FIGURE_SERIES_TOKENS.length; i += 1) {
    const [a, b] = [FIGURE_SERIES_TOKENS[i], FIGURE_SERIES_TOKENS[i + 1]];
    const [x, y] = [colors[a], colors[b]];
    if (!isCheckable(x) || !isCheckable(y)) continue;
    const cvd = deltaECvd(x, y);
    const normal = deltaE(x, y);
    if (cvd < FIGURE_TARGETS.cvdFloor) {
      error(b, `${x} and ${y} (${a}, ${b}) are ΔE ${cvd.toFixed(1)} apart for red–green colour-blind readers, below the ${FIGURE_TARGETS.cvdFloor} required`);
    } else if (cvd < FIGURE_TARGETS.cvdTarget) {
      warn(b, `${x} and ${y} (${a}, ${b}) are ΔE ${cvd.toFixed(1)} apart for red–green colour-blind readers; ${FIGURE_TARGETS.cvdTarget} is the target, so pair them with a dash or a direct label`);
    }
    if (normal < FIGURE_TARGETS.normal) {
      error(b, `${x} and ${y} (${a}, ${b}) are ΔE ${normal.toFixed(1)} apart, below the ${FIGURE_TARGETS.normal} required`);
    }
  }

  FIGURE_SERIES_TOKENS.forEach((token, i) => {
    const slot = colors[token];
    const alt = colors[FIGURE_ALT_TOKENS[i]];
    if (!isCheckable(slot) || !isCheckable(alt)) return;
    const distance = deltaE(slot, alt);
    if (distance < FIGURE_TARGETS.alt) {
      warn(FIGURE_ALT_TOKENS[i], `${alt} is ΔE ${distance.toFixed(1)} from ${token} ${slot} and may not read as a different shade`);
    }
  });

  for (const token of [...FIGURE_SERIES_TOKENS, "figure-neutral"] as const) {
    const value = colors[token];
    const fill = isCheckable(value) ? strongFill(value, appearance) : null;
    if (!fill) continue;
    const ratio = contrastRatio("#ffffff", fill);
    if (ratio < FIGURE_TARGETS.strongText) {
      error(token, `white text on its strong fill ${fill} is ${ratio.toFixed(2)}:1, below the ${FIGURE_TARGETS.strongText}:1 required`);
    }
  }

  return issues;
}
