import { describe, expect, it } from "vitest";

import {
  ANCHOR_RING,
  computeAnchorGeometry,
  fitPadding,
  type AnchorBox
} from "../../src/lib/graph/anchorLayout";

/** The article header's real slot, and the footer map's canvas. */
const HEADER: AnchorBox = { widthPx: 760, heightPx: 190, padPx: fitPadding(190) };
const FOOTER: AnchorBox = { widthPx: 370, heightPx: 240, padPx: fitPadding(240) };
const BOXES: Array<[string, AnchorBox]> = [
  ["header 760x190", HEADER],
  ["footer 370x240", FOOTER]
];

/**
 * Painted radii for `n` neighbours, drawn from the real type sizes (hub 18,
 * paper 12, teaching 11, project 11, sub-hub 10, note 9 — halved), cycled so
 * the mix is representative rather than uniform.
 */
function neighbourRadii(n: number): number[] {
  const cycle = [6, 4.5, 5.5, 9, 5, 6];
  return Array.from({ length: n }, (_, i) => cycle[i % cycle.length]);
}

const glyphsFor = (n: number) => ({ neighbourRadii: neighbourRadii(n), anchorRadius: 9 });

describe("computeAnchorGeometry", () => {
  // The property this whole module exists to guarantee. A node is painted
  // `2 * radius * zoom` pixels across, so a zoom that holds at `spec.scale` is
  // exactly the statement "a node is the same size whatever its page links to".
  describe("scale is an input, not a measurement", () => {
    for (const [label, box] of BOXES) {
      // 1..7 covers every hub and sub-hub in the corpus.
      for (let n = 1; n <= 7; n += 1) {
        it(`holds zoom at the stated scale for ${n} neighbour(s) — ${label}`, () => {
          const { zoom } = computeAnchorGeometry(ANCHOR_RING, box, glyphsFor(n));
          expect(zoom).toBe(ANCHOR_RING.scale);
        });
      }
    }
  });

  // The contrapositive of the entire bug class this replaced: glyph size used
  // to RISE as a neighbourhood got sparser. Zoom may only ever fall as a
  // neighbourhood grows, never rise.
  it("never lets zoom rise as the neighbourhood grows", () => {
    for (const [, box] of BOXES) {
      let previous = Infinity;
      for (let n = 0; n <= 60; n += 1) {
        const { zoom } = computeAnchorGeometry(ANCHOR_RING, box, glyphsFor(n));
        expect(zoom).toBeLessThanOrEqual(previous + 1e-9);
        previous = zoom;
      }
    }
  });

  it("never exceeds the stated scale, however small the neighbourhood", () => {
    for (const [, box] of BOXES) {
      for (let n = 0; n <= 60; n += 1) {
        const { zoom } = computeAnchorGeometry(ANCHOR_RING, box, glyphsFor(n));
        expect(zoom).toBeLessThanOrEqual(ANCHOR_RING.scale + 1e-9);
      }
    }
  });

  // Degradation has one permitted direction: grow the ring first, drop the
  // scale only once growing has run out of canvas.
  it("grows the ring before it gives up any scale", () => {
    const crowded = computeAnchorGeometry(ANCHOR_RING, HEADER, glyphsFor(40));
    expect(crowded.growth).toBeGreaterThan(1);
    expect(crowded.ringRadius).toBeGreaterThan(crowded.targetRadius);
    expect(crowded.zoom).toBeLessThan(ANCHOR_RING.scale);
  });

  it("leaves the ring at its target while the neighbourhood still fits", () => {
    for (let n = 0; n <= 7; n += 1) {
      const { growth, ringRadius, targetRadius } = computeAnchorGeometry(
        ANCHOR_RING,
        HEADER,
        glyphsFor(n)
      );
      expect(growth).toBe(1);
      expect(ringRadius).toBe(targetRadius);
    }
  });

  it("reports growth of at least 1 at every size", () => {
    for (const [, box] of BOXES) {
      for (let n = 0; n <= 60; n += 1) {
        const { growth } = computeAnchorGeometry(ANCHOR_RING, box, glyphsFor(n));
        expect(growth).toBeGreaterThanOrEqual(1);
      }
    }
  });

  // A transcription of the formula as it stood in GraphCanvas at 335b29b,
  // before it moved here. Guards the extraction itself: if the two ever
  // disagree, the move changed behaviour.
  it("agrees with the pre-extraction formula", () => {
    const previousImplementation = (box: AnchorBox, radii: number[]) => {
      const usablePx = Math.min(box.widthPx / 2 - box.padPx, box.heightPx / 2 - box.padPx);
      const maxRadius = radii.length ? Math.max(...radii) : 0;
      const meanRadius = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 0;
      const usable = usablePx / 1.8;
      const target = 0.72 * usable;
      const needed = radii.length ? (radii.length * (2 * meanRadius + 10)) / (2 * Math.PI) : 0;
      const ringRadius = Math.max(target, needed);
      const zoom = Math.min(1.8, usablePx / Math.max(ringRadius + maxRadius, 1));
      return { ringRadius, zoom };
    };

    for (const [, box] of BOXES) {
      for (let n = 0; n <= 40; n += 1) {
        const radii = neighbourRadii(n);
        const now = computeAnchorGeometry(ANCHOR_RING, box, {
          neighbourRadii: radii,
          anchorRadius: 9
        });
        const before = previousImplementation(box, radii);
        expect(now.ringRadius).toBeCloseTo(before.ringRadius, 10);
        expect(now.zoom).toBeCloseTo(before.zoom, 10);
      }
    }
  });

  it("survives an empty neighbourhood", () => {
    const { ringRadius, growth, zoom } = computeAnchorGeometry(ANCHOR_RING, HEADER, {
      neighbourRadii: [],
      anchorRadius: 9
    });
    expect(Number.isFinite(ringRadius)).toBe(true);
    expect(growth).toBe(1);
    expect(zoom).toBe(ANCHOR_RING.scale);
  });
});

describe("fitPadding", () => {
  it("clamps to its floor and ceiling", () => {
    expect(fitPadding(50)).toBe(12);
    expect(fitPadding(190)).toBe(15);
    expect(fitPadding(240)).toBe(19);
    expect(fitPadding(5000)).toBe(80);
  });
});
