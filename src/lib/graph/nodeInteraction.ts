import { getEntryType, graphConfig } from "../../config";
import type { EntryType, LabelVisibility } from "../../config";

/**
 * Pointer-to-node geometry for the graph canvas.
 *
 * These are deliberately plain functions over node coordinates. `GraphCanvas`
 * used to lean on react-force-graph's built-in hit detection, which works by
 * painting every node in a unique ID colour onto an off-screen canvas and
 * reading back the single pixel under the cursor. Browsers with canvas
 * fingerprinting protection (Brave's is on by default) perturb that read-back
 * by a bit or two; the ID decode has an integrity check, the check fails, and
 * the node reports as "nothing here" — silently unhoverable and unclickable,
 * for a stable subset of nodes, with the graph still looking perfect.
 *
 * Doing the arithmetic ourselves sidesteps that entirely, and has the pleasant
 * side effect of being testable without a DOM.
 */

/** Smallest pointer target, in graph units — keeps 9px notes reachable. */
const MIN_HIT_RADIUS = 8;

/** Grab room beyond the painted glyph, in graph units. */
const HIT_PADDING = 3;

/**
 * How close to the horizontal axis counts as *on* it, in graph units. Far
 * above the ~1e-14 that trigonometry leaves behind, far below any placement a
 * layout means.
 */
const AXIS_EPSILON = 1e-6;

export type HubLayout = "circle" | "row" | "force";
export type LabelSide = "top" | "bottom" | "auto";
export type LabelPlacement = "top" | "bottom";

/** Just the fields these helpers read; the real nodes carry much more. */
export type PositionedNode = {
  type?: EntryType;
  x?: number;
  y?: number;
};

/** Radius `drawNode` paints the glyph at, in graph units. */
export function nodePaintedRadius(node?: { type?: EntryType }): number {
  return Math.max(3, getEntryType(node?.type as EntryType).graph.size / 2);
}

/**
 * Radius of a node's pointer target, in graph units. Scales with the painted
 * glyph so a hub owns proportionally more canvas than a note, with a floor so
 * the smallest types stay comfortably clickable.
 */
export function nodeHitRadius(node?: { type?: EntryType }): number {
  return Math.max(MIN_HIT_RADIUS, nodePaintedRadius(node) + HIT_PADDING);
}

/**
 * The node under a point given in *graph* coordinates, or `null`. When targets
 * overlap the nearest centre wins, so a small node sitting on top of a hub is
 * still reachable.
 */
export function nodeAtPoint<T extends PositionedNode>(
  nodes: readonly T[],
  x: number,
  y: number
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const node of nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance > nodeHitRadius(node) || distance >= bestDistance) continue;
    bestDistance = distance;
    best = node;
  }
  return best;
}

/** Per-type label visibility, treating unknown types as "hover". */
/**
 * Which side of a node its painted label sits on.
 *
 * `AXIS_EPSILON` is the point of the comparison. Under the circle layout a hub
 * is pinned at `radius * Math.sin(angle)`, and `Math.sin(Math.PI)` is
 * 1.2246e-16 rather than 0 — so on an even-numbered circle the left-hand hub
 * tested as *below* centre by roughly 1e-14 graph units while the right-hand
 * one, whose sine is exactly 0, tested as above. Two hubs on the same
 * horizontal line ended up with their labels on opposite sides, decided
 * entirely by rounding. Anything within the epsilon of the axis is treated as
 * on it, and takes the same "top" default as every other undecided case.
 */
export function resolveLabelSide(
  yPos: number | null,
  options: { labelSide: LabelSide; hubLayout: HubLayout }
): LabelPlacement {
  if (options.labelSide === "top") return "top";
  if (options.labelSide === "bottom") return "bottom";
  // "auto": only the circle layout has an above/below to derive from.
  if (options.hubLayout === "row" || options.hubLayout === "force") return "top";
  return yPos != null && yPos > AXIS_EPSILON ? "bottom" : "top";
}

export function labelVisibilityFor(type?: EntryType): LabelVisibility {
  const cfg = (graphConfig.nodeTypes as Record<string, { labelVisibility?: LabelVisibility }>)[
    type as string
  ];
  return cfg?.labelVisibility ?? "hover";
}

/**
 * Whether a type responds to clicks. Opt-out per entry type via
 * `graph.interactive: false`; the surface still decides overall by passing (or
 * withholding) `onSelect`.
 */
export function isTypeInteractive(type?: EntryType): boolean {
  const cfg = (graphConfig.nodeTypes as Record<string, { interactive?: boolean }>)[type as string];
  return cfg?.interactive !== false;
}
