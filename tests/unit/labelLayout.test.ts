import { describe, expect, it } from "vitest";

import {
  overlaps,
  placeLabel,
  placeRequiredLabel,
  screenToGraph,
  wrapLabel
} from "../../src/lib/graph/labelLayout";

// Monospace stand-in: every character is 6 units wide.
const measure = (text: string) => text.length * 6;
const view = { x0: 0, y0: 0, x1: 400, y1: 300 };

describe("wrapLabel", () => {
  it("leaves a short title on one line", () => {
    expect(wrapLabel("Relational Bottlenecks", measure, 200, 3)).toEqual(["Relational Bottlenecks"]);
  });

  it("keeps every line within the width", () => {
    const lines = wrapLabel("On the Sample Complexity of Learning Compositional Functions", measure, 150, 3);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(150);
  });

  it("balances lines instead of stranding a word", () => {
    const lines = wrapLabel("Learning Theory and Generalization Bounds", measure, 210, 3);
    expect(lines).toHaveLength(2);
    const [a, b] = lines.map((line) => line.length);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(8);
  });

  it("ends in an ellipsis when the title needs more lines than allowed", () => {
    const lines = wrapLabel(
      "Attention as Relational Reasoning: Revisiting the Inductive Biases of Transformers",
      measure,
      120,
      2
    );
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(120);
  });

  it("truncates a single word wider than the line", () => {
    const [line] = wrapLabel("Supercalifragilisticexpialidocious", measure, 60, 2);
    expect(line.endsWith("…")).toBe(true);
    expect(measure(line)).toBeLessThanOrEqual(60);
  });
});

describe("placeLabel", () => {
  const size = { width: 100, height: 20 };
  const opts = { radius: 8, gap: 7, margin: 6, view };

  it("sits centred above the node", () => {
    const box = placeLabel({ x: 200, y: 150 }, size, opts)!;
    expect((box.x0 + box.x1) / 2).toBe(200);
    expect(box.y1).toBe(150 - 8 - 7);
  });

  it("slides inside the canvas near an edge", () => {
    const box = placeLabel({ x: 10, y: 150 }, size, opts)!;
    expect(box.x0).toBe(6);
  });

  it("goes below a node too close to the top", () => {
    const box = placeLabel({ x: 200, y: 20 }, size, opts)!;
    expect(box.y0).toBe(20 + 8 + 7);
  });

  it("tries the other side when the first overlaps a taken label, then gives up", () => {
    const node = { x: 200, y: 150 };
    const above = placeLabel(node, size, opts)!;
    const below = placeLabel(node, size, { ...opts, taken: [above] })!;
    expect(below.y0).toBeGreaterThan(node.y);
    expect(placeLabel(node, size, { ...opts, taken: [above, below] })).toBeNull();
    expect(overlaps(above, below)).toBe(false);
  });
});

describe("placeRequiredLabel", () => {
  const view = { x0: 0, y0: 0, x1: 400, y1: 300 };
  const options = { radius: 10, gap: 8, margin: 6, view };
  const size = { width: 120, height: 36 };
  const node = { x: 80, y: 80 };

  it("goes above the node when nothing is in the way", () => {
    const box = placeRequiredLabel(node, size, options, []);
    expect(box.y1).toBeLessThanOrEqual(node.y);
  });

  it("moves below the node when the legend covers the space above", () => {
    const legend = { x0: 12, y0: 12, x1: 145, y1: 54 };
    const box = placeRequiredLabel(node, size, options, [legend]);
    expect(box.y0).toBeGreaterThanOrEqual(node.y);
    expect(overlaps(box, legend)).toBe(false);
  });

  it("keeps its usual place when both sides are covered", () => {
    const everywhere = { x0: 0, y0: 0, x1: 400, y1: 300 };
    expect(placeRequiredLabel(node, size, options, [everywhere])).toEqual(placeLabel(node, size, options));
  });
});

describe("screenToGraph", () => {
  it("undoes the canvas transform and the device pixel ratio", () => {
    // Zoom 2 on a 2x screen, origin moved to (100, 50) device pixels.
    const box = screenToGraph({ x0: 50, y0: 25, x1: 150, y1: 75 }, { a: 4, d: 4, e: 100, f: 50 }, 2);
    expect(box).toEqual({ x0: 0, y0: 0, x1: 50, y1: 25 });
  });
});
