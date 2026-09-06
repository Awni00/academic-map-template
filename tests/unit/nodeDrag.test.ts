import { describe, expect, it } from "vitest";

import { entryTypeIds } from "../../src/config";
import {
  DRAG_CLICK_TOLERANCE_PX,
  beginGrab,
  canDragNode,
  grabTarget,
  passedThreshold,
  pinAfterCancel
} from "../../src/lib/graph/nodeDrag";
import { isTypeInteractive } from "../../src/lib/graph/nodeInteraction";

const press = { clientX: 100, clientY: 100 };

/** A free node the simulation owns, grabbed 3 units up-left of its centre. */
const freeGrab = () =>
  beginGrab({ id: "note", type: "note", x: 10, y: 10 }, { x: 7, y: 6 }, press);

/** A node the layout pinned — a `hubLayout: "circle"` hub, or the anchor. */
const pinnedGrab = () =>
  beginGrab({ id: "hub", type: "hub", x: 50, y: -20, fx: 50, fy: -20 }, { x: 50, y: -20 }, press);

describe("grab offset", () => {
  it("keeps the node under the part of it you grabbed", () => {
    const grab = freeGrab();
    // Pointer has not moved, so neither should the node.
    expect(grabTarget(grab, { x: 7, y: 6 })).toEqual({ x: 10, y: 10 });
  });

  it("moves the node by exactly the pointer's graph-space delta", () => {
    const grab = freeGrab();
    expect(grabTarget(grab, { x: 7 + 12, y: 6 - 4 })).toEqual({ x: 22, y: 6 });
  });

  // The property that makes an absolute screen->graph mapping correct where a
  // cached zoom factor is not: the same graph point yields the same node
  // position no matter what the transform did in between.
  it("is invariant to a zoom or pan landing mid-drag", () => {
    const grab = freeGrab();
    const target = grabTarget(grab, { x: 30, y: 30 });
    expect(target).toEqual({ x: 33, y: 34 });
    // A different transform producing the same graph point must agree.
    expect(grabTarget(grab, { x: 30, y: 30 })).toEqual(target);
  });

  it("survives a node that has no position yet", () => {
    const grab = beginGrab({ id: "fresh", type: "note" }, { x: 5, y: 5 }, press);
    expect(grabTarget(grab, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
  });
});

describe("passedThreshold", () => {
  // Must agree exactly with GraphCanvas's click guard, which declines to
  // select when `travel > DRAG_CLICK_TOLERANCE_PX`. Asserted against the
  // shared constant so the two rules cannot be edited apart.
  it("is false at exactly the tolerance and true just past it", () => {
    const grab = freeGrab();
    expect(passedThreshold(grab, press.clientX + DRAG_CLICK_TOLERANCE_PX, press.clientY)).toBe(
      false
    );
    expect(
      passedThreshold(grab, press.clientX + DRAG_CLICK_TOLERANCE_PX + 0.01, press.clientY)
    ).toBe(true);
  });

  it("measures diagonal travel, not per-axis", () => {
    const grab = freeGrab();
    // 3-4-5: exactly the tolerance, so still a click.
    expect(passedThreshold(grab, press.clientX + 3, press.clientY + 4)).toBe(false);
    expect(passedThreshold(grab, press.clientX + 4, press.clientY + 4)).toBe(true);
  });

  it("treats a press that has not moved as a click", () => {
    expect(passedThreshold(freeGrab(), press.clientX, press.clientY)).toBe(false);
  });
});

describe("pinAfterCancel", () => {
  // The regression this guards: restoring the pin the node *had* rather than
  // clearing it. Clearing would delete the `fx/fy` that `hubLayout` puts on
  // hubs, the first time an interrupted drag touched one.
  it("returns both the position and the pin, so a cancel is a true no-op", () => {
    expect(pinAfterCancel(freeGrab())).toEqual({
      fx: undefined,
      fy: undefined,
      x: 10,
      y: 10
    });
    expect(pinAfterCancel(pinnedGrab())).toEqual({ fx: 50, fy: -20, x: 50, y: -20 });
  });
});

describe("canDragNode", () => {
  it("refuses the anchor, which is the layout's origin rather than a node", () => {
    for (const type of entryTypeIds) {
      expect(canDragNode({ id: "centre", type }, "centre")).toBe(false);
      expect(canDragNode({ id: "other", type }, "centre")).toBe(
        canDragNode({ id: "other", type })
      );
    }
  });

  it("refuses empty canvas", () => {
    expect(canDragNode(null)).toBe(false);
    expect(canDragNode(undefined)).toBe(false);
  });

  it("drags exactly the types that are interactive", () => {
    for (const type of entryTypeIds) {
      expect(canDragNode({ id: "n", type })).toBe(isTypeInteractive(type));
    }
  });
});
