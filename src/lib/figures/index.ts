import type * as Plot from "@observablehq/plot";

/**
 * Figure definitions and the shared style constants they use.
 *
 * Safe to import from the browser: building a chart's options touches no DOM.
 * Rendering lives in `render.ts` (build time) and `client.ts` (browser).
 *
 * Colour is the one thing Plot can't take as a CSS variable, because it parses
 * colours. Figures draw with the sentinel hexes below instead, and the output
 * has each sentinel swapped for its `var(--figure-*)` token. Those tokens are
 * theme roles (`figure-1` … `figure-6`, `figure-N-alt`, `figure-neutral`; see
 * `src/lib/theme/figureColors.ts`), so charts follow the theme toggle. Every
 * other colour (ink, axes, grid) is set from the theme in `figures.css`.
 */

/** Widths the chart is drawn at, in CSS px. Type sizes assume 1:1 display. */
export const FIGURE_SIZES = { narrow: 360, medium: 560, full: 760 } as const;
export type FigureSize = keyof typeof FIGURE_SIZES;

/** Phone layout: a medium or full figure is also drawn at this width and swapped in. */
export const FIGURE_COMPACT_WIDTH = 360;

/** Series colours, in their fixed order. Never cycle past six. */
export const SERIES = ["#000101", "#000102", "#000103", "#000104", "#000105", "#000106"] as const;
/**
 * A companion shade of each series colour, for a series closely related to
 * another (a model and its variant): same hue, clearly different lightness,
 * still >= 3:1 against the page.
 */
export const SERIES_ALT = ["#000111", "#000112", "#000113", "#000114", "#000115", "#000116"] as const;
/** Baselines, catch-all groups and reference lines. */
export const NEUTRAL = "#000107";

export const COLOR_TOKENS: Record<string, string> = {
  ...Object.fromEntries(SERIES.map((hex, i) => [hex, `var(--figure-${i + 1})`])),
  ...Object.fromEntries(SERIES_ALT.map((hex, i) => [hex, `var(--figure-${i + 1}-alt)`])),
  [NEUTRAL]: "var(--figure-neutral)"
};

export const colorToken = (color: string) => COLOR_TOKENS[color] ?? color;

/** Dash pattern for the secondary series of a pair, in px. */
export const DASH = "5,2.5";

/** `className` for error-bar marks: 1px rules in label ink. */
export const ERROR_BAR = "figure-error";
/** `className` for a zero baseline rule. */
export const BASELINE = "figure-baseline";

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹"
};

/** Tick format for log axes: 10⁻², 10⁻¹, 10⁰. */
export const powerOfTen = (v: number) =>
  "10" + String(Math.round(Math.log10(v))).replace(/./g, (c) => SUPERSCRIPT[c] ?? c);

// Rows come from CSV through autoType, so field types are only known per figure.
export type FigureRow = Record<string, any>;

export type FigureContext = {
  data: FigureRow[];
  width: number;
  /** True for the phone layout of a medium or full chart. */
  compact: boolean;
};

/**
 * One legend entry. Legends are drawn by <Chart>, not Plot, so every chart
 * gets the same one: below the plot, left-aligned, with line keys for lines
 * (dashed when the series is) and square keys for fills.
 */
export type LegendItem =
  | {
      label: string;
      /** A SERIES sentinel or NEUTRAL. */
      color: string;
      /** `region` and `arrow` are diagram keys: a tinted outlined square, an arrow. */
      key: "line" | "swatch" | "dot" | "region" | "arrow";
      /** true for the standard dash, or an SVG dash pattern such as "1.5,3" (dotted). */
      dashed?: boolean | string;
    }
  | {
      /** An ordinal or sequential key: one hue at increasing opacity. */
      key: "ramp";
      label: string;
      color: string;
      /** Opacity of each step, low to high. */
      opacities: number[];
      /** End labels, e.g. "1" and "10". */
      from: string;
      to: string;
    };

export type FigureDefinition = {
  /** Path under `src/data/figures/`. */
  data: string;
  size: FigureSize;
  /** Default alt text; the page can override it. */
  alt?: string;
  /** Panel title, drawn small and left-aligned above the plot. */
  title?: string;
  legend?: LegendItem[];
  /** Parts set in the code face because they name identifiers. */
  mono?: Array<"x" | "fx" | "legend">;
  plot: (context: FigureContext) => Plot.PlotOptions;
};

export const defineFigure = (definition: FigureDefinition) => definition;

/**
 * An interactive figure's browser half: `src/site/figures/<id>.client.ts`
 * default-exports one of these. `root` is the `.figure-chart` element; the
 * build-time SVG is in its `.figure-chart__plot`, which `mount` may replace or
 * enhance. `data` is the definition's data file, already parsed.
 */
export type FigureClient = (root: HTMLElement, context: { data: FigureRow[] }) => void | Promise<void>;

export const defineFigureClient = (mount: FigureClient) => mount;

/**
 * Site defaults for every chart:
 * - axis labels name the quantity, without Plot's direction arrows;
 * - x and y labels are centred on their axis (the y label rotated), with the
 *   margins widened so they clear the tick labels.
 */
export function withSiteDefaults(options: Plot.PlotOptions): Plot.PlotOptions {
  const axes = Object.fromEntries(
    (["x", "y", "fx", "fy"] as const).map((key) => [
      key,
      { labelArrow: "none", ...(key === "x" || key === "y" ? { labelAnchor: "center" } : {}), ...options[key] }
    ])
  ) as Pick<Plot.PlotOptions, "x" | "y" | "fx" | "fy">;
  const labelled = (scale: Plot.ScaleOptions | undefined) =>
    typeof scale?.label === "string" && scale.axis !== null && (scale.labelAnchor ?? "center") === "center";
  const margins: Partial<Plot.PlotOptions> = {};
  if (labelled(axes.y)) margins.marginLeft = (options.marginLeft ?? 40) + 14;
  if (labelled(axes.x)) margins.marginBottom = Math.max(options.marginBottom ?? 30, 44);
  // `figure-plot` scopes the chart styles; a definition's own class is kept.
  const className = ["figure-plot", options.className].filter(Boolean).join(" ");
  return { ...options, ...axes, ...margins, className };
}

export function replaceColorSentinels(html: string): string {
  for (const [sentinel, token] of Object.entries(COLOR_TOKENS)) {
    html = html.replaceAll(sentinel, token);
  }
  return html;
}
