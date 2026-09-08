export type Point = { x: number; y: number };

/**
 * The rings making up one edge: a quad along its length, plus a triangle per
 * arrowhead.
 *
 * Every ring winds the same direction, which is the property that lets a caller
 * fill them as a single path. Under non-zero winding, same-wound overlaps union
 * (winding 2, still inside) while opposite-wound overlaps cancel to zero and
 * punch a hole — so the arrowheads on a reciprocal edge must not be mirror
 * images of each other, however natural that construction looks.
 */
export type EdgeGeometry = {
  /** `null` when the glyphs leave no room between them. */
  shaft: Point[] | null;
  heads: Point[][];
};

export type EdgeGeometryOptions = {
  /** Painted radius of each glyph, so no part of an edge hides under a node. */
  sourceRadius: number;
  targetRadius: number;
  /** Full width of the line, centred on the axis. */
  width: number;
  directed: boolean;
  /** Reciprocal edges are drawn once, with a head at each end. */
  bidirectional: boolean;
  arrow: {
    /** Along the edge. */
    length: number;
    /** Out to each side, so a head is `2 * width` across. */
    width: number;
    /**
     * Where the tip sits on the span between the two glyph edges: 1 puts it at
     * the target's boundary, lower values slide it back along the edge.
     */
    relPos: number;
  };
};

/** Twice the enclosed area, signed: positive is counter-clockwise. */
export function signedArea(ring: Point[]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    total += a.x * b.y - b.x * a.y;
  }
  return total;
}

/**
 * The filled outline of one edge.
 *
 * Shaft and heads deliberately overlap. They are meant to be filled together as
 * one path, where overlap costs nothing and a gap between them would show as a
 * seam once antialiasing rounds the two boundaries apart. What must not happen
 * is filling them as separate operations under a translucent alpha: canvas
 * composites each operation on its own, so the shared region would land at
 * 1 - (1 - alpha)^2 and the arrow would read as two stacked objects rather than
 * one. Overlap between *different* edges is a separate matter, and is meant to
 * darken — that is what makes a dense region look dense.
 */
export function edgeGeometry(
  source: Point,
  target: Point,
  options: EdgeGeometryOptions
): EdgeGeometry {
  const empty: EdgeGeometry = { shaft: null, heads: [] };
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return empty;

  const ux = dx / length;
  const uy = dy / length;

  const from = options.sourceRadius;
  const to = length - options.targetRadius;
  // Glyphs meeting or overlapping leave no edge to draw.
  if (to <= from) return empty;

  const at = (distance: number, offset = 0): Point => ({
    // `offset` steps along the normal, which is the axis turned a quarter turn.
    x: source.x + ux * distance - uy * offset,
    y: source.y + uy * distance + ux * offset
  });

  const half = options.width / 2;
  // Wound to match the heads below: down one side, back along the other.
  const shaft = [at(from, -half), at(to, -half), at(to, half), at(from, half)];

  const heads: Point[][] = [];
  if (options.directed) {
    const span = to - from;
    const addHead = (tipDistance: number, sign: 1 | -1) => {
      const base = tipDistance - sign * options.arrow.length;
      // Offsets are signed by the head's own direction, not the edge's, and
      // ordered to match the shaft's winding above. Both matter: a head
      // pointing back down the edge would otherwise mirror the forward one and
      // cancel it to a hole wherever the two met.
      heads.push([
        at(tipDistance),
        at(base, sign * options.arrow.width),
        at(base, -sign * options.arrow.width)
      ]);
    };
    addHead(from + span * options.arrow.relPos, 1);
    if (options.bidirectional) addHead(to - span * options.arrow.relPos, -1);
  }

  return { shaft, heads };
}
