import { describe, expect, it } from "vitest";

import {
  edgeGeometry,
  signedArea,
  type EdgeGeometryOptions,
  type Point
} from "../../src/lib/graph/edgeGeometry";

const arrow = { length: 5, width: 1.5, relPos: 1 };

function options(overrides: Partial<EdgeGeometryOptions> = {}): EdgeGeometryOptions {
  return {
    sourceRadius: 5,
    targetRadius: 9,
    width: 1,
    directed: true,
    bidirectional: false,
    arrow,
    ...overrides
  };
}

const rings = (geometry: { shaft: Point[] | null; heads: Point[][] }) =>
  [...(geometry.shaft ? [geometry.shaft] : []), ...geometry.heads];

describe("edgeGeometry", () => {
  it("winds every ring the same direction", () => {
    // The invariant the single-fill rendering rests on. Two rings wound
    // opposite ways cancel to winding zero under a non-zero fill and punch a
    // hole where they overlap — which is what mirrored arrowheads used to do
    // wherever two of them met.
    const cases: EdgeGeometryOptions[] = [
      options(),
      options({ bidirectional: true }),
      options({ bidirectional: true, arrow: { ...arrow, relPos: 0.4 } }),
      options({ sourceRadius: 18, targetRadius: 18 }),
      options({ arrow: { ...arrow, length: 12, width: 6 } })
    ];
    const directions: Point[] = [
      { x: 100, y: 0 },
      { x: -100, y: 0 },
      { x: 0, y: 100 },
      { x: 0, y: -100 },
      { x: 60, y: 80 },
      { x: -60, y: -80 }
    ];
    for (const config of cases) {
      for (const target of directions) {
        const geometry = edgeGeometry({ x: 0, y: 0 }, target, config);
        const signs = rings(geometry).map((ring) => Math.sign(signedArea(ring)));
        expect(signs.every((sign) => sign !== 0)).toBe(true);
        expect(new Set(signs).size).toBe(1);
      }
    }
  });

  it("runs the shaft between the glyph edges, not between the centres", () => {
    const { shaft } = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, options());
    const xs = shaft!.map((point) => point.x);
    // Source glyph edge at 5, target glyph edge at 100 - 9.
    expect(Math.min(...xs)).toBe(5);
    expect(Math.max(...xs)).toBe(91);
    // Centred on the axis, `width` across.
    const ys = shaft!.map((point) => point.y);
    expect(Math.min(...ys)).toBe(-0.5);
    expect(Math.max(...ys)).toBe(0.5);
  });

  it("overlaps the head onto the shaft rather than butting them together", () => {
    // Filled as one path, so overlap is free — while a gap would show as a
    // seam once antialiasing rounded the two boundaries apart.
    const { shaft, heads } = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, options());
    const shaftMax = Math.max(...shaft!.map((point) => point.x));
    const headMin = Math.min(...heads[0].map((point) => point.x));
    expect(headMin).toBeLessThan(shaftMax);
  });

  it("gives a reciprocal edge one shaft and a head at each end", () => {
    const { shaft, heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ bidirectional: true })
    );
    expect(shaft).not.toBeNull();
    expect(heads).toHaveLength(2);
    // Tips point outward, one at each glyph edge.
    const tips = heads.map((head) => head[0].x).sort((a, b) => a - b);
    expect(tips).toEqual([5, 91]);
  });

  it("places a head mid-edge when relPos is below 1", () => {
    const { heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ arrow: { ...arrow, relPos: 0.5 } })
    );
    // Halfway along the 5..91 span between the glyph edges.
    expect(heads[0][0].x).toBe(48);
  });

  it("draws a plain line when the graph is undirected", () => {
    const { shaft, heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ directed: false })
    );
    expect(heads).toHaveLength(0);
    expect(shaft).not.toBeNull();
  });

  it("draws nothing when the glyphs meet or coincide", () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 10, y: 0 }, options())).toEqual({
      shaft: null,
      heads: []
    });
    expect(edgeGeometry({ x: 7, y: 7 }, { x: 7, y: 7 }, options())).toEqual({
      shaft: null,
      heads: []
    });
  });

  it("keeps the head square to the edge on a diagonal", () => {
    const { heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 60, y: 80 },
      options({ sourceRadius: 0, targetRadius: 0 })
    );
    const [tip, left, right] = heads[0];
    const midX = (left.x + right.x) / 2;
    const midY = (left.y + right.y) / 2;
    expect(Math.hypot(left.x - midX, left.y - midY)).toBeCloseTo(arrow.width, 10);
    expect(Math.hypot(right.x - midX, right.y - midY)).toBeCloseTo(arrow.width, 10);
    expect(Math.hypot(tip.x - midX, tip.y - midY)).toBeCloseTo(arrow.length, 10);
  });
});
