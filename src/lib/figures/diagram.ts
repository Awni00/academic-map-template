import { escapeHtml } from "./escape";
import type { FigureSize, LegendItem } from "./index";
import { hasTex, texToHtml, texToPlain } from "./tex";

/**
 * Build-time diagrams: schematic figures (automata, set pictures, block
 * diagrams) drawn as inline SVG with the same palette, type and line weights
 * as the charts. A definition draws into a `DiagramCanvas` sized to its
 * preset; `<Diagram>` inlines the result, so it recolours with the theme.
 *
 * Shapes take a `tone`: a series slot (1–6), "neutral", or "ink". Regions
 * are an opaque tint of the tone (so overlapping regions stay distinct) with
 * an outline in the tone itself. Lines and arrows are drawn in the tone.
 * Labels are set in the page's UI face; `$…$` segments render with KaTeX.
 */

/** `"inverse"` is white: text on a `strong` fill. */
export type Tone = 1 | 2 | 3 | 4 | 5 | 6 | "neutral" | "ink" | "muted" | "inverse";

export type Point = { x: number; y: number };

export type DiagramContext = { width: number; compact: boolean };

export type DiagramDefinition = {
  size: FigureSize;
  alt?: string;
  title?: string;
  legend?: LegendItem[];
  /**
   * Play-once animation. The root gets `data-animated`; once half of the
   * diagram, or half the viewport, is covered by it, it gets `data-play`
   * after `delay` ms (default 400), and a Replay button appears to restart it. Write keyframes with `raw("<style>…</style>")`
   * under `.figure-diagram[data-play]`, with class names prefixed per
   * diagram. The static drawing is the final frame: without JS, or with
   * reduced motion, `data-play` is never set.
   */
  animate?: { delay?: number };
  draw: (context: DiagramContext) => DiagramCanvas;
};

export const defineDiagram = (definition: DiagramDefinition) => definition;

/** Line weights (px). Outlines and arrows share one weight; frames are hairlines. */
export const STROKE = { line: 1.25, frame: 1, emphasis: 2 } as const;
/** Arrowhead length and half-width (px). */
const HEAD = { length: 7, halfWidth: 3.25 };

const toneClass = (tone: Tone) => `d-tone-${tone}`;

const fmt = (n: number) => String(Math.round(n * 100) / 100);

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const length = (a: Point) => Math.hypot(a.x, a.y);
const unit = (a: Point) => scale(a, 1 / (length(a) || 1));
const polar = (angleDeg: number, r: number): Point => ({
  x: r * Math.cos((angleDeg * Math.PI) / 180),
  y: r * Math.sin((angleDeg * Math.PI) / 180)
});

type Anchor = "start" | "middle" | "end";
type Baseline = "top" | "middle" | "bottom";

export type LabelOptions = {
  anchor?: Anchor;
  baseline?: Baseline;
  /** "sm" 12px for annotations, "md" 13px for labels, "lg" 15px for node names. */
  size?: "sm" | "md" | "lg";
  tone?: Tone;
  /** Paint the page background behind the label, to sit on a line. */
  halo?: boolean;
  italic?: boolean;
};

export type RegionOptions = {
  tone?: Tone;
  /**
   * "tint" (default): opaque tint with an outline; "solid"; "strong": a darker
   * shade of the tone, no outline, for white (`tone: "inverse"`) labels;
   * "none": outline only.
   */
  fill?: "tint" | "solid" | "strong" | "none";
  stroke?: boolean;
  strokeWidth?: number;
  /** A second ring inside the outline (an accepting state). */
  double?: boolean;
  dashed?: boolean;
  radius?: number;
};

export type ArrowOptions = {
  tone?: Tone;
  strokeWidth?: number;
  dashed?: boolean;
  head?: "end" | "start" | "both" | "none";
};

/** A node a curved edge can attach to: a centre and a radius to trim at. */
export type Node = Point & { r: number };

export class DiagramCanvas {
  private parts: string[] = [];

  constructor(
    readonly width: number,
    readonly height: number
  ) {}

  /** Raw SVG, for the odd shape the helpers don't cover. Use tone classes. */
  raw(svg: string) {
    this.parts.push(svg);
    return this;
  }

  private regionAttrs({ tone = "ink", fill = "tint", stroke = true, strokeWidth, dashed }: RegionOptions) {
    const classes = ["d-region", toneClass(tone), `d-fill-${fill}`, stroke ? "" : "d-no-stroke"].filter(Boolean);
    const width = strokeWidth ?? STROKE.line;
    return `class="${classes.join(" ")}" stroke-width="${width}"${dashed ? ` stroke-dasharray="4,3"` : ""}`;
  }

  circle(c: Point, r: number, options: RegionOptions = {}) {
    this.parts.push(`<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" ${this.regionAttrs(options)} />`);
    if (options.double) {
      const tone = options.tone ?? "ink";
      this.parts.push(
        `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r - 3.5)}" class="d-region ${toneClass(tone)} d-fill-none" stroke-width="${STROKE.line}" />`
      );
    }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, options: RegionOptions = {}) {
    const rx = options.radius ?? 0;
    this.parts.push(
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${rx ? ` rx="${rx}"` : ""} ${this.regionAttrs(options)} />`
    );
    return this;
  }

  /** A plot-style frame: a hairline box in the rule colour. */
  frame(x: number, y: number, w: number, h: number) {
    this.parts.push(
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" class="d-frame" stroke-width="${STROKE.frame}" />`
    );
    return this;
  }

  dot(c: Point, options: { tone?: Tone; r?: number } = {}) {
    const { tone = "ink", r = 3 } = options;
    this.parts.push(`<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${r}" class="d-dot ${toneClass(tone)}" />`);
    return this;
  }

  /** Arrowhead with its tip at `tip`, pointing along `direction`. */
  private head(tip: Point, direction: Point, tone: Tone) {
    const d = unit(direction);
    const n = { x: -d.y, y: d.x };
    const base = sub(tip, scale(d, HEAD.length));
    const a = add(base, scale(n, HEAD.halfWidth));
    const b = sub(base, scale(n, HEAD.halfWidth));
    this.parts.push(
      `<path d="M${fmt(tip.x)},${fmt(tip.y)}L${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}Z" class="d-head ${toneClass(tone)}" />`
    );
  }

  private stroke(d: string, { tone = "ink", strokeWidth = STROKE.line, dashed }: ArrowOptions) {
    this.parts.push(
      `<path d="${d}" class="d-line ${toneClass(tone)}" stroke-width="${strokeWidth}"${dashed ? ` stroke-dasharray="5,2.5"` : ""} />`
    );
  }

  /** A straight arrow from `a` to `b` (tip at `b`). */
  arrow(a: Point, b: Point, options: ArrowOptions = {}) {
    const { head = "end", tone = "ink" } = options;
    const d = unit(sub(b, a));
    // Stop the line short of the tip, so its end doesn't show past the head.
    const inset = HEAD.length * 0.6;
    const p = head === "start" || head === "both" ? add(a, scale(d, inset)) : a;
    const q = head === "end" || head === "both" ? sub(b, scale(d, inset)) : b;
    this.stroke(`M${fmt(p.x)},${fmt(p.y)}L${fmt(q.x)},${fmt(q.y)}`, options);
    if (head === "end" || head === "both") this.head(b, d, tone);
    if (head === "start" || head === "both") this.head(a, scale(d, -1), tone);
    return this;
  }

  line(a: Point, b: Point, options: ArrowOptions = {}) {
    return this.arrow(a, b, { ...options, head: "none" });
  }

  /**
   * An edge between two nodes, trimmed at their outlines. `bend` (degrees)
   * curves it to the left of travel, like TikZ's `bend left`. Returns the
   * curve's midpoint, for a label.
   */
  edge(from: Node, to: Node, options: ArrowOptions & { bend?: number; gap?: number } = {}): Point {
    const { bend = 0, gap = 1.5, tone = "ink" } = options;
    const chord = sub(to, from);
    const mid = add(from, scale(chord, 0.5));
    // Left of travel, in SVG's y-down frame.
    const left = unit({ x: chord.y, y: -chord.x });
    const control = add(mid, scale(left, (length(chord) / 2) * Math.tan((bend * Math.PI) / 180)));
    const start = add(from, scale(unit(sub(control, from)), from.r + gap));
    const tip = add(to, scale(unit(sub(control, to)), to.r + gap));
    const direction = sub(tip, control);
    const end = sub(tip, scale(unit(direction), HEAD.length * 0.6));
    if (bend === 0) {
      this.stroke(`M${fmt(start.x)},${fmt(start.y)}L${fmt(end.x)},${fmt(end.y)}`, options);
    } else {
      this.stroke(`M${fmt(start.x)},${fmt(start.y)}Q${fmt(control.x)},${fmt(control.y)} ${fmt(end.x)},${fmt(end.y)}`, options);
    }
    this.head(tip, direction, tone);
    return add(add(scale(start, 0.25), scale(control, 0.5)), scale(tip, 0.25));
  }

  /**
   * A self-loop on a node, leaving at `angle - spread/2` and returning at
   * `angle + spread/2` (degrees, 0 = right, 90 = down): a symmetric
   * teardrop whose size is `reach` node radii. Returns a point just beyond
   * the loop's apex, for a label.
   */
  loop(node: Node, angle: number, options: ArrowOptions & { spread?: number; reach?: number } = {}): Point {
    const { spread = 40, reach = 2.4, tone = "ink" } = options;
    const a0 = angle - spread / 2;
    const a1 = angle + spread / 2;
    const start = add(node, polar(a0, node.r + 1.5));
    const tip = add(node, polar(a1, node.r + 1.5));
    // Controls flare past the endpoints, so the loop opens into a round lobe.
    const c0 = add(node, polar(a0 - 10, node.r * (1 + reach)));
    const c1 = add(node, polar(a1 + 10, node.r * (1 + reach)));
    const direction = sub(tip, c1);
    const end = sub(tip, scale(unit(direction), HEAD.length * 0.6));
    this.stroke(
      `M${fmt(start.x)},${fmt(start.y)}C${fmt(c0.x)},${fmt(c0.y)} ${fmt(c1.x)},${fmt(c1.y)} ${fmt(end.x)},${fmt(end.y)}`,
      options
    );
    this.head(tip, direction, tone);
    const apex = scale(add(add(start, tip), scale(add(c0, c1), 3)), 1 / 8);
    return add(apex, polar(angle, 9));
  }

  /**
   * A label. Plain text is SVG text; text with `$…$` is KaTeX HTML in a
   * foreignObject centred on the same anchor point.
   */
  label(at: Point, text: string, options: LabelOptions = {}) {
    const { anchor = "middle", baseline = "middle", size = "md", tone = "ink", halo = false, italic = false } = options;
    const classes = ["d-label", `d-label--${size}`, toneClass(tone), halo ? "d-halo" : "", italic ? "d-italic" : ""]
      .filter(Boolean)
      .join(" ");
    if (hasTex(text)) {
      const box = { w: 480, h: 40 };
      const x = anchor === "start" ? at.x : anchor === "end" ? at.x - box.w : at.x - box.w / 2;
      const y = baseline === "top" ? at.y : baseline === "bottom" ? at.y - box.h : at.y - box.h / 2;
      this.parts.push(
        `<foreignObject x="${fmt(x)}" y="${fmt(y)}" width="${box.w}" height="${box.h}" class="d-tex">` +
          `<div xmlns="http://www.w3.org/1999/xhtml" class="${classes}" data-anchor="${anchor}" data-baseline="${baseline}">` +
          `<span>${texToHtml(text)}</span></div></foreignObject>`
      );
    } else {
      const dominant = baseline === "top" ? "hanging" : baseline === "bottom" ? "auto" : "central";
      this.parts.push(
        `<text x="${fmt(at.x)}" y="${fmt(at.y)}" text-anchor="${anchor}" dominant-baseline="${dominant}" class="${classes}">${escapeHtml(text)}</text>`
      );
    }
    return this;
  }

  toSvg(ariaLabel: string) {
    return (
      `<svg class="figure-diagram__svg" viewBox="0 0 ${fmt(this.width)} ${fmt(this.height)}" width="${fmt(this.width)}" height="${fmt(this.height)}" role="img" aria-label="${escapeHtml(texToPlain(ariaLabel))}">` +
      this.parts.join("") +
      `</svg>`
    );
  }
}

export const canvas = (width: number, height: number) => new DiagramCanvas(width, height);
