import { describe, expect, it } from "vitest";

import { entryTypeIds } from "../../src/config";
import {
  isTypeInteractive,
  labelVisibilityFor,
  nodeAtPoint,
  nodeHitRadius,
  nodePaintedRadius,
  resolveLabelSide
} from "../../src/lib/graph/nodeInteraction";

const hub = { id: "learning", type: "hub", x: 0, y: 0 };
const note = { id: "note", type: "note", x: 40, y: 0 };

describe("nodeHitRadius", () => {
  it("gives every configured type a reachable target", () => {
    for (const type of entryTypeIds) {
      expect(nodeHitRadius({ type })).toBeGreaterThanOrEqual(8);
    }
  });

  it("scales with the painted glyph and always leaves grab room", () => {
    expect(nodePaintedRadius(hub)).toBeGreaterThan(nodePaintedRadius(note));
    expect(nodeHitRadius(hub)).toBeGreaterThan(nodeHitRadius(note));
    for (const type of entryTypeIds) {
      expect(nodeHitRadius({ type })).toBeGreaterThan(nodePaintedRadius({ type }));
    }
  });
});

describe("nodeAtPoint", () => {
  it("finds a node when the point is inside its target", () => {
    expect(nodeAtPoint([hub, note], 0, 0)).toBe(hub);
    expect(nodeAtPoint([hub, note], 40, 0)).toBe(note);
  });

  it("returns null over empty canvas", () => {
    expect(nodeAtPoint([hub, note], 200, 200)).toBeNull();
  });

  it("hits slightly off-centre, up to the node's radius", () => {
    const r = nodeHitRadius(hub);
    expect(nodeAtPoint([hub], r - 0.5, 0)).toBe(hub);
    expect(nodeAtPoint([hub], r + 0.5, 0)).toBeNull();
  });

  it("prefers the nearest centre when targets overlap", () => {
    // A small note sitting almost on top of a hub must stay reachable.
    const overlapping = { id: "on-top", type: "note", x: 3, y: 0 };
    expect(nodeAtPoint([hub, overlapping], 3, 0)).toBe(overlapping);
    expect(nodeAtPoint([hub, overlapping], 0, 0)).toBe(hub);
  });

  it("ignores nodes the simulation has not positioned yet", () => {
    expect(nodeAtPoint([{ id: "x", type: "note" }], 0, 0)).toBeNull();
  });
});

describe("config-driven behaviour", () => {
  it("marks hubs as permanently labelled and everything else as hover", () => {
    expect(labelVisibilityFor("hub")).toBe("always");
    expect(labelVisibilityFor("sub-hub")).toBe("hover");
    expect(labelVisibilityFor("note")).toBe("hover");
  });

  it("treats unknown types as hover", () => {
    expect(labelVisibilityFor("not-a-real-type")).toBe("hover");
  });

  it("treats every type as clickable unless it opts out", () => {
    for (const type of entryTypeIds) expect(isTypeInteractive(type)).toBe(true);
  });
});

describe("resolveLabelSide", () => {
  const auto = { labelSide: "auto", hubLayout: "circle" } as const;

  /** The y a hub is pinned at, exactly as the circle layout computes it. */
  const circleY = (index: number, count: number, radius = 145) =>
    Math.sin((2 * Math.PI * index) / count - Math.PI / 2) * radius;

  it("puts hubs on the horizontal axis on the same side", () => {
    // A hub lands on the axis only when the count divides by 4 — that is where
    // the circle puts one at 0 degrees and another at 180.
    for (const count of [4, 8, 12]) {
      const axis = [count / 4, (3 * count) / 4].map((index) => circleY(index, count));
      expect(axis.every((y) => Math.abs(y) < 1e-6)).toBe(true);
      expect(new Set(axis.map((y) => resolveLabelSide(y, auto))).size).toBe(1);
    }
  });

  it("does not let trigonometric noise decide a side", () => {
    // The bug this epsilon exists for. Both hubs are meant to sit exactly on
    // the axis, but Math.sin(Math.PI) is 1.2246e-16 rather than 0, so the
    // left-hand one tests as strictly below centre — by about 1e-14 units.
    const right = circleY(1, 4);
    const left = circleY(3, 4);
    expect(right).toBe(0);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(1e-6);
    expect(resolveLabelSide(left, auto)).toBe(resolveLabelSide(right, auto));
  });

  it("still splits hubs that are genuinely above or below centre", () => {
    expect(resolveLabelSide(circleY(0, 4), auto)).toBe("top");
    expect(resolveLabelSide(circleY(2, 4), auto)).toBe("bottom");
  });

  it("honours an explicit side over the layout", () => {
    expect(resolveLabelSide(500, { labelSide: "top", hubLayout: "circle" })).toBe("top");
    expect(resolveLabelSide(-500, { labelSide: "bottom", hubLayout: "circle" })).toBe("bottom");
  });

  it("keeps labels above the node in layouts with no vertical order", () => {
    for (const hubLayout of ["row", "force"] as const) {
      expect(resolveLabelSide(500, { labelSide: "auto", hubLayout })).toBe("top");
    }
  });

  it("defaults to top for a node with no position yet", () => {
    expect(resolveLabelSide(null, auto)).toBe("top");
  });
});
