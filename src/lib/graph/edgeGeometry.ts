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

/** A quadratic edge: start, one control point, end. */
export type CurvedEdge = { start: Point; control: Point; end: Point };

/**
 * The bowed line drawn for an undirected edge.
 *
 * The control point sits off the midpoint by `curvature` times the span, on the
 * normal turned a quarter turn from source to target. The sign therefore
 * follows the edge's direction, so a pair of nodes linked once gets one arc, and
 * the bow keeps parallel edges from fanning out of a hub as a single bar.
 *
 * Each end is pulled back along the curve's own tangent by that glyph's radius,
 * so the line meets a node's rim rather than its centre. That matters when the
 * node is faded: an edge running to the centre would show through it.
 */
export function curvedEdge(
  source: Point,
  target: Point,
  options: { sourceRadius: number; targetRadius: number; curvature: number }
): CurvedEdge | null {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (length <= options.sourceRadius + options.targetRadius) return null;

  const control = {
    x: (source.x + target.x) / 2 + dy * options.curvature,
    y: (source.y + target.y) / 2 - dx * options.curvature
  };
  const toward = (from: Point, distance: number): Point => {
    const tx = control.x - from.x;
    const ty = control.y - from.y;
    const t = Math.hypot(tx, ty) || 1;
    return { x: from.x + (tx / t) * distance, y: from.y + (ty / t) * distance };
  };
  return {
    start: toward(source, options.sourceRadius),
    control,
    end: toward(target, options.targetRadius)
  };
}

/** A point on the quadratic from `start` through `control` to `end`, at `t`. */
function pointAt(curve: CurvedEdge, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * curve.start.x + 2 * u * t * curve.control.x + t * t * curve.end.x,
    y: u * u * curve.start.y + 2 * u * t * curve.control.y + t * t * curve.end.y
  };
}

/** The part of a quadratic between `ta` and `tb`, itself a quadratic. */
function slice(curve: CurvedEdge, ta: number, tb: number): CurvedEdge {
  const { start: s, control: c, end: e } = curve;
  const k0 = (1 - ta) * (1 - tb);
  const k1 = (1 - ta) * tb + ta * (1 - tb);
  const k2 = ta * tb;
  return {
    start: pointAt(curve, ta),
    control: { x: k0 * s.x + k1 * c.x + k2 * e.x, y: k0 * s.y + k1 * c.y + k2 * e.y },
    end: pointAt(curve, tb)
  };
}

/**
 * A curved edge with arrowheads: the same bow as `curvedEdge`, with a head at
 * the target end (and the source end when `bidirectional`), each pointing along
 * the curve where it lands.
 *
 * The shaft stops where a head begins, so a translucent edge never doubles up
 * under its own arrowhead. Heads are wound the same way as `edgeGeometry`'s.
 */
export function curvedArrow(
  source: Point,
  target: Point,
  options: {
    sourceRadius: number;
    targetRadius: number;
    curvature: number;
    bidirectional: boolean;
    arrow: { length: number; width: number };
  }
): { shaft: CurvedEdge; heads: Point[][] } | null {
  const curve = curvedEdge(source, target, options);
  if (!curve) return null;
  const span = Math.hypot(curve.end.x - curve.start.x, curve.end.y - curve.start.y) || 1;
  // Fraction of the curve one head takes up, measured along the chord, which a
  // gentle bow keeps close enough to the arc length.
  const share = Math.min(0.45, options.arrow.length / span);

  const head = (tip: Point, from: Point): Point[] => {
    const dx = tip.x - from.x;
    const dy = tip.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const bx = tip.x - ux * options.arrow.length;
    const by = tip.y - uy * options.arrow.length;
    const w = options.arrow.width;
    return [tip, { x: bx - uy * w, y: by + ux * w }, { x: bx + uy * w, y: by - ux * w }];
  };

  const heads = [head(curve.end, pointAt(curve, 1 - share))];
  if (options.bidirectional) heads.push(head(curve.start, pointAt(curve, share)));
  const shaft = slice(curve, options.bidirectional ? share : 0, 1 - share);
  return { shaft, heads };
}
