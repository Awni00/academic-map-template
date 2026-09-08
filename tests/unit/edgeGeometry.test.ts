import { describe, expect, it } from "vitest";

import { edgeGeometry, type EdgeGeometryOptions } from "../../src/lib/graph/edgeGeometry";

const arrow = { length: 5, width: 1.5, relPos: 1 };

function options(overrides: Partial<EdgeGeometryOptions> = {}): EdgeGeometryOptions {
  return {
    sourceRadius: 5,
    targetRadius: 9,
    directed: true,
    bidirectional: false,
    arrow,
    ...overrides
  };
}

/** Distance of a point from the source, along a horizontal edge from (0, 0). */
const along = (p: { x: number }) => p.x;

describe("edgeGeometry", () => {
  it("runs the shaft between the glyph edges, stopping at the arrowhead", () => {
    const { shafts, heads } = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, options());
    expect(shafts).toHaveLength(1);
    expect(heads).toHaveLength(1);
    // Starts at the source glyph's edge, not its centre.
    expect(along(shafts[0].from)).toBe(5);
    // Stops at the head's base: target boundary (100 - 9) less the head length.
    expect(along(shafts[0].to)).toBe(86);
    expect(along(heads[0].tip)).toBe(91);
  });

  it("never lets a shaft overlap a head", () => {
    // The property the single-composite rendering depends on: if these two
    // overlapped, stroking all shafts and filling all heads as separate canvas
    // operations would double the alpha where they met.
    const cases: EdgeGeometryOptions[] = [
      options(),
      options({ bidirectional: true }),
      options({ arrow: { ...arrow, relPos: 0.5 } }),
      options({ bidirectional: true, arrow: { ...arrow, relPos: 0.6 } }),
      options({ sourceRadius: 18, targetRadius: 18 }),
      options({ arrow: { ...arrow, length: 12 } })
    ];
    for (const config of cases) {
      const { shafts, heads } = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, config);
      for (const shaft of shafts) {
        for (const head of heads) {
          const headLow = Math.min(along(head.tip), along(head.left));
          const headHigh = Math.max(along(head.tip), along(head.left));
          const shaftLow = Math.min(along(shaft.from), along(shaft.to));
          const shaftHigh = Math.max(along(shaft.from), along(shaft.to));
          expect(shaftHigh <= headLow || shaftLow >= headHigh).toBe(true);
        }
      }
    }
  });

  it("gives a reciprocal edge one shaft with a head at each end", () => {
    const { shafts, heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ bidirectional: true })
    );
    expect(heads).toHaveLength(2);
    expect(shafts).toHaveLength(1);
    // Tips point outward, at each glyph edge.
    expect(heads.map((head) => along(head.tip)).sort((a, b) => a - b)).toEqual([5, 91]);
    // The shaft spans the gap between the two bases.
    expect(along(shafts[0].from)).toBe(10);
    expect(along(shafts[0].to)).toBe(86);
  });

  it("splits the shaft around a head placed mid-edge", () => {
    const { shafts, heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ arrow: { ...arrow, relPos: 0.5 } })
    );
    // Span is 5..91, so the tip lands halfway at 48.
    expect(along(heads[0].tip)).toBe(48);
    expect(shafts).toHaveLength(2);
    expect(shafts.map((s) => [along(s.from), along(s.to)])).toEqual([
      [5, 43],
      [48, 91]
    ]);
  });

  it("draws a plain line when the graph is undirected", () => {
    const { shafts, heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      options({ directed: false })
    );
    expect(heads).toHaveLength(0);
    expect(shafts).toHaveLength(1);
    expect([along(shafts[0].from), along(shafts[0].to)]).toEqual([5, 91]);
  });

  it("draws nothing when the glyphs meet or coincide", () => {
    // Overlapping glyphs leave no span between their edges.
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 10, y: 0 }, options())).toEqual({
      shafts: [],
      heads: []
    });
    // Same position: no direction to draw along.
    expect(edgeGeometry({ x: 7, y: 7 }, { x: 7, y: 7 }, options())).toEqual({
      shafts: [],
      heads: []
    });
  });

  it("keeps the head's base square to the edge on a diagonal", () => {
    const { heads } = edgeGeometry(
      { x: 0, y: 0 },
      { x: 60, y: 80 },
      options({ sourceRadius: 0, targetRadius: 0 })
    );
    const [head] = heads;
    // Base corners sit symmetrically about the axis, `width` out on each side.
    const midX = (head.left.x + head.right.x) / 2;
    const midY = (head.left.y + head.right.y) / 2;
    expect(Math.hypot(head.left.x - midX, head.left.y - midY)).toBeCloseTo(arrow.width, 10);
    expect(Math.hypot(head.right.x - midX, head.right.y - midY)).toBeCloseTo(arrow.width, 10);
    // ...and the base is `length` back from the tip.
    expect(Math.hypot(head.tip.x - midX, head.tip.y - midY)).toBeCloseTo(arrow.length, 10);
  });
});
