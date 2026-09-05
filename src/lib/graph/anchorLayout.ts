/**
 * Geometry for an *anchored* graph view — one node pinned at the centre with
 * its neighbourhood arranged around it.
 *
 * The whole point of this module is that it is pure. The property it exists to
 * guarantee — that `scale` is an input and a node is painted the same size
 * whatever its page links to — used to be a comment inside a React effect,
 * where nothing could check it. Here it is arithmetic over plain numbers, and
 * `tests/unit/anchorLayout.test.ts` asserts it directly.
 */

/**
 * The numbers an anchored view is laid out from.
 *
 * `scale` is the one that matters. The alternative design — lay out under
 * whatever forces, measure the result, scale it to fill the canvas — makes the
 * painted size of a node a side effect of how many neighbours its page happens
 * to have: sparse neighbourhoods get magnified, dense ones shrink, and a node
 * means a different thing on every page. Stating the scale instead costs the
 * layout its freedom to be any size, which is what the ring fields buy back:
 * the layout is given the job of fitting the canvas.
 */
export type AnchorLayoutSpec = {
  /** Pixels per graph unit. An input, never derived from a measurement. */
  scale: number;
  /** Ring radius, as a fraction of the half-extent the canvas can show. */
  ringFraction: number;
  /** How rigidly neighbours are held to the ring. */
  ringStrength: number;
  /**
   * Many-body strength. Modest on purpose: with the radius held radially,
   * repulsion is only responsible for spreading neighbours *around* the ring,
   * and a stronger charge simply drags them off it.
   */
  charge: number;
  /**
   * Link strength. Low, because links no longer set the radius — they express
   * affinity only, drawing interlinked neighbours together around the ring
   * rather than leaving them at arbitrary angles.
   */
  linkStrength: number;
  /** Clear space between glyph edges, in graph units. */
  minGap: number;
};

/** The one shipping arrangement: neighbours on a circle about the anchor. */
export const ANCHOR_RING: AnchorLayoutSpec = {
  scale: 1.8,
  ringFraction: 0.72,
  ringStrength: 0.8,
  charge: -40,
  linkStrength: 0.1,
  minGap: 10
};

export type AnchorGeometry = {
  /** Radius the neighbours are held at, after any crowding growth. */
  ringRadius: number;
  /** Radius the spec asked for, before growth. Diagnostic. */
  targetRadius: number;
  /** `ringRadius / targetRadius`. Above 1 means crowding pushed the ring out. */
  growth: number;
  /** Pixels per graph unit actually applied. Never above `spec.scale`. */
  zoom: number;
};

export type AnchorBox = {
  widthPx: number;
  heightPx: number;
  padPx: number;
};

export type AnchorGlyphs = {
  /** Painted radius of each neighbour, in graph units. */
  neighbourRadii: number[];
  /** Painted radius of the anchor itself, in graph units. */
  anchorRadius: number;
};

/**
 * Where the ring sits and how many pixels a graph unit is worth.
 *
 * Degradation has exactly one permitted direction: a neighbourhood too big to
 * seat on the requested ring grows the *ring* first, and only once growing has
 * run out of canvas does `zoom` fall below `spec.scale`. So the common case is
 * a constant glyph size and the crowded case fails predictably, rather than
 * every case being whatever the layout happened to produce.
 */
export function computeAnchorGeometry(
  spec: AnchorLayoutSpec,
  box: AnchorBox,
  glyphs: AnchorGlyphs
): AnchorGeometry {
  const usablePx = Math.min(box.widthPx / 2 - box.padPx, box.heightPx / 2 - box.padPx);
  const radii = glyphs.neighbourRadii;
  const maxRadius = radii.length ? Math.max(...radii) : 0;
  const meanRadius = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 0;
  // Half-extent available in *graph units* at the requested scale.
  const usable = usablePx / spec.scale;
  const targetRadius = spec.ringFraction * usable;
  // Smallest ring whose circumference seats every neighbour without overlap.
  const needed = radii.length
    ? (radii.length * (2 * meanRadius + spec.minGap)) / (2 * Math.PI)
    : 0;
  const ringRadius = Math.max(targetRadius, needed);
  // Only once the ring has grown as far as it can may the scale give way.
  const zoom = Math.min(spec.scale, usablePx / Math.max(ringRadius + maxRadius, 1));
  return {
    ringRadius,
    targetRadius,
    growth: targetRadius > 0 ? ringRadius / targetRadius : 1,
    zoom
  };
}

/**
 * Padding reserved around a fitted graph, in pixels.
 *
 * Proportional to height with a floor and a ceiling, so a short canvas — the
 * article-header map is 190px — doesn't lose most of its height to padding
 * while a tall one doesn't crush its contents against the frame.
 */
export function fitPadding(height: number): number {
  return Math.max(12, Math.min(80, Math.round(height * 0.08)));
}
