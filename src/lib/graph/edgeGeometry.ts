export type Point = { x: number; y: number };

/** A straight run of the edge's line, between glyph edges and arrowheads. */
export type EdgeShaft = { from: Point; to: Point };

/** A filled triangle. `left`/`right` are the base corners, either side of the axis. */
export type EdgeHead = { tip: Point; left: Point; right: Point };

export type EdgeGeometry = { shafts: EdgeShaft[]; heads: EdgeHead[] };

export type EdgeGeometryOptions = {
  /** Painted radius of each glyph, so no part of an edge hides under a node. */
  sourceRadius: number;
  targetRadius: number;
  directed: boolean;
  /** Reciprocal edges are drawn once, with a head at each end. */
  bidirectional: boolean;
  arrow: {
    /** Along the edge. */
    length: number;
    /** Out to each side, so a head is `2 * width` across. */
    width: number;
    /**
     * Where the tip sits on the span between the two glyph edges: 1 puts it
     * at the target's boundary, lower values slide it back along the edge.
     */
    relPos: number;
  };
};

/**
 * Where to put the line segments and arrowheads for one edge.
 *
 * Split out from the canvas so it can be tested without one, and so the
 * drawing code is only path commands.
 *
 * The shafts it returns never overlap the heads: an arrowhead's footprint is
 * subtracted from the line, leaving segments either side of it. That is what
 * lets the caller stroke every shaft in one operation and fill every head in
 * another without the two darkening each other where they meet — canvas
 * composites each operation separately, so overlapping them under a
 * translucent alpha would land at 1 - (1 - alpha)^2 and read as a seam.
 */
export function edgeGeometry(
  source: Point,
  target: Point,
  options: EdgeGeometryOptions
): EdgeGeometry {
  const empty: EdgeGeometry = { shafts: [], heads: [] };
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return empty;

  const ux = dx / length;
  const uy = dy / length;
  // Unit normal, for the head's base corners.
  const px = -uy;
  const py = ux;

  const from = options.sourceRadius;
  const to = length - options.targetRadius;
  // Glyphs meeting or overlapping leave no edge to draw.
  if (to <= from) return empty;

  const at = (distance: number): Point => ({
    x: source.x + ux * distance,
    y: source.y + uy * distance
  });

  const heads: EdgeHead[] = [];
  // Spans the shaft has to leave clear, in distance along the axis.
  const blocked: Array<[number, number]> = [];

  const addHead = (tipDistance: number, sign: 1 | -1) => {
    const baseDistance = tipDistance - sign * options.arrow.length;
    const base = at(baseDistance);
    heads.push({
      tip: at(tipDistance),
      left: { x: base.x + px * options.arrow.width, y: base.y + py * options.arrow.width },
      right: { x: base.x - px * options.arrow.width, y: base.y - py * options.arrow.width }
    });
    blocked.push(
      baseDistance < tipDistance ? [baseDistance, tipDistance] : [tipDistance, baseDistance]
    );
  };

  if (options.directed) {
    const span = to - from;
    addHead(from + span * options.arrow.relPos, 1);
    if (options.bidirectional) addHead(to - span * options.arrow.relPos, -1);
  }

  blocked.sort((a, b) => a[0] - b[0]);
  const shafts: EdgeShaft[] = [];
  let cursor = from;
  for (const [low, high] of blocked) {
    if (low > cursor) shafts.push({ from: at(cursor), to: at(Math.min(low, to)) });
    cursor = Math.max(cursor, high);
  }
  if (cursor < to) shafts.push({ from: at(cursor), to: at(to) });

  return { shafts, heads };
}
