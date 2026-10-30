import { describe, expect, it } from "vitest";

import {
  centerForce,
  clusterForce,
  hubMemberCounts,
  parentHubs,
  seedPositions
} from "../../src/lib/graph/clusterLayout";

const nodes = [
  { id: "a", path: "a", type: "hub" },
  { id: "a/one", path: "a/one", type: "paper" },
  { id: "a/two", path: "a/two", type: "note" },
  { id: "b", path: "b", type: "hub" },
  { id: "b/sub", path: "b/sub", type: "sub-hub" },
  { id: "b/sub/deep", path: "b/sub/deep", type: "note" },
  { id: "loose", path: "loose", type: "note" }
];

describe("parentHubs", () => {
  it("finds the nearest containing hub or sub-hub by folder", () => {
    const parents = parentHubs(nodes);
    expect(parents.get("a/one")).toBe("a");
    expect(parents.get("b/sub")).toBe("b");
    expect(parents.get("b/sub/deep")).toBe("b/sub");
  });

  it("leaves top-level hubs and loose pages without a parent", () => {
    const parents = parentHubs(nodes);
    expect(parents.has("a")).toBe(false);
    expect(parents.has("loose")).toBe(false);
  });
});

describe("hubMemberCounts", () => {
  it("counts every page under a top-level hub, at any depth", () => {
    const counts = hubMemberCounts(nodes);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(2);
    expect(counts.has("b/sub")).toBe(false);
  });
});

describe("seedPositions", () => {
  it("is deterministic", () => {
    const parents = parentHubs(nodes);
    expect([...seedPositions(nodes, parents)]).toEqual([...seedPositions(nodes, parents)]);
  });

  it("starts members near their parent", () => {
    const parents = parentHubs(nodes);
    const seeds = seedPositions(nodes, parents);
    const hub = seeds.get("a")!;
    const member = seeds.get("a/one")!;
    expect(Math.hypot(hub.x - member.x, hub.y - member.y)).toBeLessThan(45);
  });
});

describe("clusterForce", () => {
  it("pulls a distant member toward its parent and leaves a pinned one alone", () => {
    const parent = { id: "a", x: 0, y: 0, vx: 0, vy: 0 };
    const far = { id: "a/one", x: 200, y: 0, vx: 0, vy: 0 };
    const pinned = { id: "a/two", x: 0, y: 200, vx: 0, vy: 0, fx: 0 };
    const force = clusterForce(
      new Map([
        ["a/one", "a"],
        ["a/two", "a"]
      ]),
      36,
      0.3
    );
    force.initialize([parent, far, pinned]);
    force(1);
    expect(far.vx).toBeLessThan(0);
    expect(pinned.vx).toBe(0);
    expect(pinned.vy).toBe(0);
  });
});

describe("centerForce", () => {
  it("pulls harder across the short side of a wide canvas", () => {
    const node = { id: "n", x: 100, y: 100, vx: 0, vy: 0 };
    const force = centerForce(0.07, 2);
    force.initialize([node]);
    force(1);
    expect(Math.abs(node.vy)).toBeGreaterThan(Math.abs(node.vx));
  });
});
