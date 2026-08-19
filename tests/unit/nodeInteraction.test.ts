import { describe, expect, it } from "vitest";

import { entryTypeIds } from "../../src/config";
import {
  isTypeInteractive,
  labelVisibilityFor,
  nodeAtPoint,
  nodeHitRadius,
  nodePaintedRadius
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
