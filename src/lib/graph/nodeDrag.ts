import type { DragMode, EntryType } from "../../config";
import { isTypeInteractive } from "./nodeInteraction";

export type { DragMode };

/**
 * Pointer travel (px) above which a press stops being a click.
 *
 * One constant for two rules that have to agree: below it the gesture is a
 * click and nothing moves; above it the gesture is a drag and nothing selects.
 * Two constants would leave a band where a press both selects a node *and*
 * pins it — and in a layout that keeps dropped positions, that quietly pins
 * every node anyone ever clicked.
 */
export const DRAG_CLICK_TOLERANCE_PX = 5;


export type DraggableNode = {
  id: string;
  type?: EntryType;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

export type Point = { x: number; y: number };

export type Grab = {
  id: string;
  /** Press origin in client px — the datum the click tolerance measures from. */
  clientX: number;
  clientY: number;
  /** Where the node was, in graph units, so a cancelled drag is a true no-op. */
  startX: number;
  startY: number;
  /**
   * Node centre minus pointer, in *graph* units, fixed at the press.
   *
   * Graph units rather than pixels so it survives a zoom or pan landing
   * mid-gesture: the node keeps the point of itself you actually grabbed
   * instead of jumping to sit under the cursor.
   */
  offsetX: number;
  offsetY: number;
  /**
   * The pin the node already carried, if any. `undefined` means the simulation
   * owned it. Restoring *this* on release — rather than clearing — is what
   * stops a spring-back from unpinning a hub that `hubLayout` pinned on
   * purpose.
   */
  pinX?: number;
  pinY?: number;
  /** True once travel passed the tolerance. Until then nothing has moved. */
  moved: boolean;
};

/**
 * Whether a node may be dragged at all.
 *
 * The anchor is refused: it is not a node in the layout so much as the
 * layout's origin. `radialForce` measures every neighbour's radius from it and
 * `frame()` centres the viewport on it, so dragging the anchor would not move
 * a node — it would slide the coordinate system out from under the ring.
 */
export function canDragNode(node: DraggableNode | null | undefined, anchor?: string): boolean {
  if (!node) return false;
  if (anchor && node.id === anchor) return false;
  return isTypeInteractive(node.type);
}

export function beginGrab(
  node: DraggableNode,
  graphPoint: Point,
  client: { clientX: number; clientY: number }
): Grab {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  return {
    id: node.id,
    clientX: client.clientX,
    clientY: client.clientY,
    startX: x,
    startY: y,
    offsetX: x - graphPoint.x,
    offsetY: y - graphPoint.y,
    pinX: node.fx ?? undefined,
    pinY: node.fy ?? undefined,
    moved: false
  };
}

/** Where the node belongs, given the pointer's current graph coordinates. */
export function grabTarget(grab: Grab, graphPoint: Point): Point {
  return { x: graphPoint.x + grab.offsetX, y: graphPoint.y + grab.offsetY };
}

export function passedThreshold(grab: Grab, clientX: number, clientY: number): boolean {
  return Math.hypot(clientX - grab.clientX, clientY - grab.clientY) > DRAG_CLICK_TOLERANCE_PX;
}

/** Undo: put the node back exactly where the press found it. */
export function pinAfterCancel(grab: Grab): {
  fx?: number;
  fy?: number;
  x: number;
  y: number;
} {
  return { fx: grab.pinX, fy: grab.pinY, x: grab.startX, y: grab.startY };
}
