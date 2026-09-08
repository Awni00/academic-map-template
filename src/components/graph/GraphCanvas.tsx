import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getEntryType, graphConfig, isHubType } from "../../config";
import {
  isTypeInteractive,
  labelVisibilityFor,
  nodeAtPoint,
  nodePaintedRadius
} from "../../lib/graph/nodeInteraction";
import {
  ANCHOR_RING,
  computeAnchorGeometry,
  fitPadding
} from "../../lib/graph/anchorLayout";
import {
  DRAG_CLICK_TOLERANCE_PX,
  beginGrab,
  canDragNode,
  grabTarget,
  passedThreshold,
  pinAfterCancel,
  type DragMode,
  type Grab
} from "../../lib/graph/nodeDrag";
import { edgeGeometry } from "../../lib/graph/edgeGeometry";
import type { GraphIndex } from "../../lib/graph/types";

type HubLayout = "circle" | "row" | "force";
type LabelMode = "config" | "all" | "none";
type LabelSide = "top" | "bottom" | "auto";
type SelectedStyle = "outline" | "soft-glow";
type GraphCanvasProps = {
  graph: GraphIndex;
  height?: number;
  selected?: string;
  /**
   * Nodes to paint at full strength; every other node drops to a single
   * faded tier. `undefined` means nothing is selected and all nodes paint
   * full.
   *
   * One tier, not one per mechanism: a node that misses both the type filter
   * and the focused region is faded once, not twice. Three depths of ink are
   * not legible as a ranking — they just read as "some of this is broken".
   */
  emphasized?: Set<string>;
  /**
   * The focused region, which governs *edges*: an edge fades unless both of
   * its ends are inside. `undefined` leaves every edge at full strength.
   *
   * Deliberately separate from `emphasized`, because the two answer different
   * questions. A region focus is a claim about structure, so the structure
   * inside it is part of the claim. A type or tag selection is a claim about
   * node properties, and fading the skeleton underneath one would recreate
   * exactly the emptiness that emphasis replaced — three lit nodes floating
   * in nothing, telling you nothing about where they live.
   */
  focusRegion?: Set<string>;
  selectedStyle?: SelectedStyle;
  /**
   * The node this view is *about* — the page you are on. Marked persistently
   * and independently of `selected`, which moves as the reader inspects
   * neighbours; without it the two meanings collapse and "where am I" is lost
   * the moment anything else is clicked.
   */
  anchor?: string;
  /**
   * Whether nodes can be dragged, and what a drop does — see `DragMode`.
   *
   * Defaults to "none" rather than to the site setting, so a canvas is
   * rearrangeable only where a caller says so: the decorative preview map has
   * no reason to move, and a graph that shifts under a reader who meant to
   * scroll past it is worse than an inert one.
   */
  drag?: DragMode;
  /**
   * Which painted labels to draw.
   *   "config" — honour `graphConfig.nodeTypes.{type}.labelVisibility`.
   *   "all"    — paint every node's label.
   *   "none"   — paint none (used by the per-entry local map).
   */
  labelMode?: LabelMode;
  /**
   * Side of the node where labels sit. "auto" derives from `hubLayout`.
   */
  labelSide?: LabelSide;
  onSelect?: (id: string) => void;
  /**
   * How hubs are positioned in the simulation.
   *   "force"  — let the force simulation place them (default for small
   *              neighbourhoods such as the article-page local map).
   *   "circle" — pin hubs evenly around a circle.
   *   "row"    — pin hubs in a horizontal row near the top.
   */
  hubLayout?: HubLayout;
};

/**
 * The one de-emphasis level. Deep enough to read as secondary, shallow enough
 * that the graph's skeleton survives — the whole point of fading rather than
 * removing is that the unselected nodes keep holding the structure up.
 */
const FADE_ALPHA = 0.42;
/**
 * Edges outside a focused region. Deeper than the node fade because an edge is
 * a thin shape: at the node's 0.42 it still reads as a full-strength line.
 */
const FADED_EDGE_ALPHA = 0.08;
/**
 * Labels are wayfinding, not type membership. Fading a hub's glyph is fine;
 * fading its name off the map costs the reader the only text anchors they
 * have, exactly when a filter has made everything else less familiar.
 */
const FADED_LABEL_ALPHA = 0.6;
/**
 * Ceiling for the settle-time fit. `zoomToFit` derives scale from the node
 * bounding box, which degenerates to a point for a single node and to a line
 * for two — filling the viewport with one glyph. Nothing about a small graph
 * means the reader wants to be that close to it.
 */
const MAX_FIT_ZOOM = 2.5;

type ForceGraphComponent = React.ComponentType<any>;

export default function GraphCanvas({
  graph,
  height = 520,
  selected,
  emphasized,
  focusRegion,
  selectedStyle = "outline",
  anchor,
  drag = "none",
  labelMode = "config",
  labelSide = "auto",
  onSelect,
  hubLayout = "force"
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  // Width is `null` until we've measured the container. We deliberately do
  // NOT pass a hardcoded fallback into react-force-graph: if we did, the
  // dynamic-import race (cached chunk vs. ResizeObserver's first callback)
  // could let the canvas render wider than its slot for one frame.
  const [width, setWidth] = useState<number | null>(null);
  const [ForceGraph, setForceGraph] = useState<ForceGraphComponent | null>(null);
  const [visibility, setVisibility] = useState({ active: false, started: false });
  // Node under the cursor, plus the pointer position (container px) used to
  // place the floating label. `null` when the pointer is over empty canvas.
  const [hover, setHover] = useState<{ node: any; x: number; y: number } | null>(null);
  // Where the current press started, so a pan doesn't register as a click.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  // Live for the pan predicate, which d3 evaluates at gesture start: React
  // state would be a frame late and would re-render the canvas mid-press.
  const draggingRef = useRef(false);
  // The gesture in progress, paired with the live node object the simulation
  // owns, so a move costs no lookup.
  const grabRef = useRef<{ grab: Grab; node: any } | null>(null);
  // Mirrors `draggingRef` into React purely to drive `autoPauseRedraw` and the
  // cursor. Set once at each end of a gesture, never per move.
  const [dragging, setDragging] = useState(false);
  // Pins left behind by a drag. `graphData` builds fresh node objects whenever
  // it recomputes — a width change, a filter change — so without this a dropped
  // node silently jumps home the first time the column resizes.
  const dropsRef = useRef(new Map<string, { fx: number; fy: number }>());
  // Set when a drag reheats the engine, so the engine stop that follows is not
  // mistaken for "the layout settled, re-frame the view".
  const skipReframeRef = useRef(false);

  // Drops belong to a graph, not to a component instance. Cleared during render
  // rather than in an effect, which would run after the memo had already
  // applied them to the wrong graph.
  const dropsGraphRef = useRef(graph);
  if (dropsGraphRef.current !== graph) {
    dropsGraphRef.current = graph;
    dropsRef.current.clear();
  }
  // Bumped on every theme switch purely to force a re-render — see the
  // MutationObserver below for why that's what repaints the canvas.
  const [, setThemeVersion] = useState(0);

  useEffect(() => {
    let active = true;
    import("react-force-graph-2d").then((module) => {
      if (active) setForceGraph(() => module.default as ForceGraphComponent);
    });
    return () => {
      active = false;
    };
  }, []);

  // Hydration can happen below the fold or in a background tab. Wait until
  // both the slot and document are visible before mounting the simulation,
  // then retain it and pause/resume so scrolling never resets its layout.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let intersects = false;
    const update = () => {
      const active = intersects && document.visibilityState === "visible";
      setVisibility((previous) =>
        previous.active === active
          ? previous
          : { active, started: previous.started || active }
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(container);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useLayoutEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (visibility.active) fg.resumeAnimation();
    else fg.pauseAnimation();
  }, [ForceGraph, width, visibility]);

  // Measure synchronously before the browser paints so the first render
  // already has the correct width — avoids a flash of overshoot while the
  // ResizeObserver is still wiring up.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const measure = () =>
      setWidth(Math.max(80, Math.floor(node.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Resolve the side a label should appear on, using the prop-or-config
  // override when explicit, otherwise deriving from the hub layout.
  const resolveSide = (yPos: number | null): "top" | "bottom" => {
    if (labelSide === "top") return "top";
    if (labelSide === "bottom") return "bottom";
    // "auto"
    if (hubLayout === "row" || hubLayout === "force") return "top";
    // "circle": upper-half hubs go above, lower-half hubs go below.
    return yPos != null && yPos > 0 ? "bottom" : "top";
  };

  /**
   * The edges actually painted, with reciprocal pairs collapsed into one.
   *
   * `A→B` and `B→A` are separate entries in the index and used to be stroked
   * on top of each other — in this template that was 22 of 35 edges drawn
   * twice, so most of the map rendered at 1 − (1−α)² and the rest at α. That
   * read as two tiers of edge darkness encoding reciprocity by accident.
   * Merged, a reciprocal edge is one shaft with an arrowhead at each end,
   * which states the same fact deliberately.
   */
  const drawnEdges = useMemo(() => {
    const key = (a: string, b: string) => `${a}\u0000${b}`;
    const present = new Set(graph.edges.map((edge) => key(edge.source, edge.target)));
    const done = new Set<string>();
    const out: Array<{ source: string; target: string; bidirectional: boolean }> = [];
    for (const edge of graph.edges) {
      if (edge.source === edge.target) continue;
      if (done.has(key(edge.source, edge.target)) || done.has(key(edge.target, edge.source))) continue;
      done.add(key(edge.source, edge.target));
      out.push({
        source: edge.source,
        target: edge.target,
        bidirectional: present.has(key(edge.target, edge.source))
      });
    }
    return out;
  }, [graph]);

  const graphData = useMemo(() => {
    const w = width ?? 800;
    const h = height;
    const hubs = graph.nodes.filter((node) => isHubType(node.type));
    const pinned: Record<string, { fx: number; fy: number; side: "top" | "bottom" }> = {};

    if (hubLayout === "circle" && hubs.length > 0) {
      // Pin hubs on a circle around the simulation origin. The radius is
      // kept conservative so satellites still have room to fan outward
      // without pushing the auto-fit's bounding box past the viewport.
      const baseRadius = Math.min(w, h) * 0.22;
      // For single-hub graphs, a "circle" of radius 0 just pins it at the
      // centre, which is a sensible degenerate case.
      const radius = hubs.length === 1 ? 0 : baseRadius;
      for (let i = 0; i < hubs.length; i += 1) {
        const angle = (2 * Math.PI * i) / hubs.length - Math.PI / 2;
        const fx = Math.cos(angle) * radius;
        const fy = Math.sin(angle) * radius;
        pinned[hubs[i].id] = { fx, fy, side: resolveSide(fy) };
      }
    } else if (hubLayout === "row" && hubs.length > 0) {
      // Spread hubs evenly along a horizontal line in the top third of
      // the canvas, so satellites flow downward like a shallow tree.
      const usable = w * 0.56;
      const step = hubs.length === 1 ? 0 : usable / (hubs.length - 1);
      const y = -h * 0.18;
      for (let i = 0; i < hubs.length; i += 1) {
        const x = hubs.length === 1 ? 0 : -usable / 2 + step * i;
        pinned[hubs[i].id] = { fx: x, fy: y, side: resolveSide(y) };
      }
    }

    // Pin the anchor at the origin, so the neighbourhood has a fixed centre
    // rather than one the simulation happens to settle on.
    if (anchor) {
      pinned[anchor] = { fx: 0, fy: 0, side: resolveSide(0) };
    }

    return {
      nodes: graph.nodes.map((node) => {
        // A position the reader chose outranks the one the layout computed.
        // Reading a ref here is safe because drops are written during a gesture
        // that triggers no recompute, and read on the next recompute that some
        // other dependency causes — this must never be what *causes* one.
        const drop = dropsRef.current.get(node.id);
        if (drop) {
          return { ...node, fx: drop.fx, fy: drop.fy, _labelSide: resolveSide(drop.fy) };
        }
        const pin = pinned[node.id];
        if (pin) {
          return {
            ...node,
            fx: pin.fx,
            fy: pin.fy,
            _labelSide: pin.side
          };
        }
        // Unpinned nodes still get a side, derived from the same rule with
        // no y-position context yet — defaults to "top".
        return { ...node, _labelSide: resolveSide(null) };
      }),
      links: graph.edges.map((edge) => ({ ...edge }))
    };
  }, [graph, hubLayout, height, width, labelSide, anchor]);

  // Drop a stale hover when the node set changes underneath it (e.g. a filter
  // removed the node the cursor was over).
  useEffect(() => {
    setHover(null);
  }, [graphData]);

  /**
   * Repaint when the site theme changes.
   *
   * Node and link colours are read from CSS custom properties at paint time
   * (see `cssVar`), so they are only as fresh as the last paint. force-graph
   * stops painting altogether once the simulation cools — `autoPauseRedraw`
   * defaults to true, and its render loop skips the frame unless something has
   * marked the canvas dirty. Flipping `data-theme` restyles the page around the
   * canvas but never touches that flag, so the graph keeps the old theme's
   * colours until some unrelated event (a resize, a filter change) happens to
   * invalidate it — hence "the graph stays inverted for ten seconds".
   *
   * Re-rendering fixes it: force-graph's canvas-object props are plain
   * callbacks recreated on every render, so reapplying them marks the canvas
   * dirty and the next frame repaints with the new colours. We only need to
   * cause the render — hence a counter whose value nothing reads.
   *
   * NB: this relies on those props staying inline. Memoising them (useCallback)
   * without adding a theme dependency would silently bring the bug back.
   */
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => setThemeVersion((version) => version + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    return () => observer.disconnect();
  }, []);

  /** Convert a pointer event to container-relative px, or null if not ready. */
  const pointerToContainer = (event: { clientX: number; clientY: number }) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  /** Hit-test an event's own position. Never trust `hover` for this: a click
   *  or tap needn't be preceded by a pointer move over the same spot. */
  const nodeUnderEvent = (event: { clientX: number; clientY: number }) => {
    const fg = fgRef.current;
    const point = pointerToContainer(event);
    if (!fg?.screen2GraphCoords || !point) return null;
    const graphPoint = fg.screen2GraphCoords(point.x, point.y);
    return {
      node: nodeAtPoint(graphData.nodes as any[], graphPoint.x, graphPoint.y),
      point,
      graphPoint
    };
  };

  /**
   * Suppress canvas panning for exactly the length of a node drag.
   *
   * force-graph exposes the pan gate as a predicate its d3-zoom filter
   * evaluates at gesture start, declared `triggerUpdate: false` — so reading a
   * ref is enough and costs no render. `event.stopPropagation()` cannot do this
   * job: d3 listens natively on the canvas for `mousedown`, while React's
   * handler is delegated from the island root and sees `pointerdown`, a
   * different event on a different element. Wheel zoom is untouched, since
   * force-graph skips the pan clause for `wheel`.
   */
  const allowPan = useCallback(() => !draggingRef.current, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const held = grabRef.current;
    if (held) {
      dragTo(held, event);
      return; // no hit test and no hover churn while a node is in hand
    }
    const hit = nodeUnderEvent(event);
    if (!hit) return;
    // Skip the state churn when the pointer is idling over empty canvas.
    if (!hit.node && !hover) return;
    setHover(hit.node ? { node: hit.node, x: hit.point.x, y: hit.point.y } : null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pressRef.current = { x: event.clientX, y: event.clientY };
    if (drag === "none") return;
    // Touch is left to pan and pinch. Claiming the gesture would need
    // `touch-action: none` across the canvas — d3 only blocks page scroll from
    // its own `touchmove` — which costs a tall canvas its scroll-through on a
    // phone, and there is no hover on touch to say what you are about to grab.
    if (event.pointerType === "touch") return;
    const hit = nodeUnderEvent(event);
    if (!hit?.node || !canDragNode(hit.node, anchor)) return;
    grabRef.current = { grab: beginGrab(hit.node, hit.graphPoint, event), node: hit.node };
    draggingRef.current = true;
    // Survive leaving the container: without capture, a fast drag off the edge
    // drops the node wherever the pointer happened to cross the boundary.
    // Capture is a convenience, not a requirement — it throws if the pointer is
    // no longer active, and losing it should not cost us the drag.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* no capture; the gesture still works inside the container */
    }
  }

  function dragTo(held: { grab: Grab; node: any }, event: React.PointerEvent<HTMLDivElement>) {
    const fg = fgRef.current;
    const point = pointerToContainer(event);
    if (!fg?.screen2GraphCoords || !point) return;
    const { grab, node } = held;
    if (!grab.moved) {
      // Nothing is written below the tolerance, so a click can never pin a
      // node — which would otherwise quietly pin every node anyone clicked.
      if (!passedThreshold(grab, event.clientX, event.clientY)) return;
      grab.moved = true;
      // The only two renders a gesture costs, both at its edges: one to unpause
      // the redraw loop and change the cursor, one to put them back.
      setDragging(true);
      // The floating label would fight the cursor it is anchored to.
      setHover(null);
    }
    const target = grabTarget(grab, fg.screen2GraphCoords(point.x, point.y));
    // `fx/fy` instructs the simulation; `x/y` is what gets painted, what the
    // links read for their endpoints, and what `nodeAtPoint` hit-tests. On a
    // cooled engine no tick ever runs to copy one into the other.
    node.fx = target.x;
    node.fy = target.y;
    node.x = target.x;
    node.y = target.y;
  }

  function applyPin(node: any, pin: { fx?: number; fy?: number }) {
    node.fx = pin.fx;
    node.fy = pin.fy;
    if (pin.fx != null && pin.fy != null) {
      dropsRef.current.set(node.id, { fx: pin.fx, fy: pin.fy });
    } else {
      dropsRef.current.delete(node.id);
    }
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const held = grabRef.current;
    grabRef.current = null;
    draggingRef.current = false;
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* already released by the browser */
    }
    // Never crossed the tolerance: that was a click, and nothing moved.
    if (!held || !held.grab.moved) return;
    setDragging(false);
    const { grab, node } = held;
    if (cancelled) {
      const back = pinAfterCancel(grab);
      applyPin(node, back);
      node.x = back.x;
      node.y = back.y;
      return;
    }
    // Both draggable modes keep the position the reader chose. They differ in
    // whether the rest of the layout is then asked to accommodate it.
    applyPin(node, { fx: node.x, fy: node.y });
    if (drag === "resettle") {
      skipReframeRef.current = true;
      fgRef.current?.d3ReheatSimulation?.();
    }
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!onSelect) return;
    if (press) {
      const travel = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (travel > DRAG_CLICK_TOLERANCE_PX) return; // that was a pan
    }
    const node = nodeUnderEvent(event)?.node;
    if (!node || !isTypeInteractive(node.type)) return;
    onSelect(node.id);
  }

  // The selected node is the view you are already looking at, so it reads as
  // clickable but does nothing. Exclude it rather than promising a navigation
  // the surface will decline.
  const hoverIsClickable = Boolean(
    hover && onSelect && hover.node.id !== selected && isTypeInteractive(hover.node.type)
  );
  // With painted labels suppressed, the floating label is a node's only channel
  // for its title, so every hovered node gets one regardless of its configured
  // visibility. Honouring `labelVisibility` here would leave "always" types
  // (hubs) silently anonymous — labelled nowhere on the canvas and unlabelled
  // on hover — which is exactly backwards for the biggest nodes in the view.
  const showFloatingLabel = Boolean(
    hover && (labelMode === "none" || labelVisibilityFor(hover.node.type) === "hover")
  );

  /**
   * Where the neighbours sit and how many pixels a graph unit is worth. Pure
   * arithmetic, so it lives in `lib/graph/anchorLayout` where a unit test can
   * hold it to the invariant it exists for — see that module for the why.
   */
  const anchorGeometry = useMemo(
    () =>
      computeAnchorGeometry(
        ANCHOR_RING,
        { widthPx: width ?? 800, heightPx: height, padPx: fitPadding(height) },
        {
          neighbourRadii: graph.nodes
            .filter((node) => node.id !== anchor)
            .map((node) => nodePaintedRadius(node)),
          anchorRadius: nodePaintedRadius(graph.nodes.find((node) => node.id === anchor))
        }
      ),
    [width, height, graph.nodes, anchor]
  );

  /**
   * Frame the viewport.
   *
   * Without an anchor, fit every node's bounding box.
   *
   * With one, there is nothing to fit: the anchor goes dead centre and the
   * zoom is `anchorGeometry`'s, decided before the layout ran. Measuring the
   * layout and scaling it to fill would hand the neighbour count control of
   * how big a node is painted, which is the one thing this view must not do.
   */
  const liveNodeById = useMemo(
    // The simulation mutates x/y on these objects in place, so the map stays
    // valid for the life of a `graphData` and never needs rebuilding per frame.
    () => new Map((graphData.nodes as Array<{ id: string }>).map((node) => [node.id, node as any])),
    [graphData]
  );

  /**
   * Paint the edges, one composited object per edge.
   *
   * The unit of compositing is the edge. Canvas composites each drawing
   * operation separately, so anything drawn twice under a translucent alpha
   * lands at 1 - (1 - alpha)^2 rather than alpha. Within one arrow that reads
   * as a fault — the line and its head are one thing, and a darker wedge where
   * they meet makes them look like two stacked objects. Between two different
   * edges the same effect is the point: crossings should darken, because that
   * is what makes a dense part of the map look dense.
   *
   * So each edge's shaft and heads go into one path and are filled once, and
   * separate edges get separate fills. `edgeGeometry` winds every ring the same
   * direction so that single fill unions them rather than punching a hole where
   * they overlap.
   */
  const drawEdges = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { width, opacity, directed, arrow } = graphConfig.links;
      const edgeColor = resolveColor(graphConfig.links.color);
      const headColor = arrow.color === "edge" ? edgeColor : resolveColor(arrow.color);
      // Heads only join the shaft's path when they share its colour. Given a
      // colour of their own they are a separate mark and belong on top, where
      // compositing over the line is the intent rather than an artefact.
      const headsShareShaft = headColor === edgeColor;

      const ring = (path: Path2D, points: { x: number; y: number }[]) => {
        path.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) path.lineTo(points[i].x, points[i].y);
        path.closePath();
      };

      ctx.save();
      for (const edge of drawnEdges) {
        const source = liveNodeById.get(edge.source);
        const target = liveNodeById.get(edge.target);
        if (!source || !target) continue;
        if (typeof source.x !== "number" || typeof target.x !== "number") continue;

        const { shaft, heads } = edgeGeometry(source, target, {
          sourceRadius: nodePaintedRadius(source),
          targetRadius: nodePaintedRadius(target),
          width,
          directed,
          bidirectional: edge.bidirectional,
          arrow
        });
        if (!shaft && heads.length === 0) continue;

        const faded = focusRegion
          ? !(focusRegion.has(edge.source) && focusRegion.has(edge.target))
          : false;
        ctx.globalAlpha = faded ? FADED_EDGE_ALPHA : opacity;

        const body = new Path2D();
        if (shaft) ring(body, shaft);
        if (headsShareShaft) for (const head of heads) ring(body, head);
        ctx.fillStyle = edgeColor;
        ctx.fill(body);

        if (!headsShareShaft && heads.length > 0) {
          const tips = new Path2D();
          for (const head of heads) ring(tips, head);
          ctx.fillStyle = headColor;
          ctx.fill(tips);
        }
      }
      ctx.restore();
    },
    [drawnEdges, liveNodeById, focusRegion]
  );

  const frame = (duration: number) => {
    const fg = fgRef.current;
    if (!fg || width == null) return;
    const padding = fitPadding(height);
    const nodes = graphData.nodes as Array<{ id: string; x?: number; y?: number; type?: any }>;
    const anchorNode = anchor ? nodes.find((node) => node.id === anchor) : undefined;
    if (!anchorNode || typeof anchorNode.x !== "number") {
      // `zoomToFit` reads its scale off the node bounding box, which has no
      // area for one node and no height for two in a row — so a small graph
      // gets magnified until a single glyph fills the canvas. Where the fit
      // would exceed the ceiling we centre and cap by hand; everywhere else
      // this defers to the library, so the ordinary case is untouched.
      const box = boundingBox(nodes);
      const fit = box
        ? Math.min(
            (width - padding * 2) / Math.max(box.w, 1e-6),
            (height - padding * 2) / Math.max(box.h, 1e-6)
          )
        : Infinity;
      if (box && fit > MAX_FIT_ZOOM) {
        fg.centerAt?.(box.cx, box.cy, duration);
        fg.zoom?.(MAX_FIT_ZOOM, duration);
      } else {
        fg.zoomToFit?.(duration, padding);
      }
      return;
    }
    fg.centerAt?.(anchorNode.x, anchorNode.y, duration);
    fg.zoom?.(anchorGeometry.zoom, duration);
  };

  // Tune the d3-force simulation so hubs get more personal space than the
  // small entries around them. The default many-body strength is a flat
  // -30 per node; we make hubs noticeably more repulsive, and we lengthen
  // links that touch a hub so the cluster around each hub fans out.
  useEffect(() => {
    if (!ForceGraph || !fgRef.current) return;
    const fg = fgRef.current;
    // An anchored view is a small neighbourhood in a small box, and it wants
    // visibly separated nodes. Many-body repulsion already acts between every
    // pair, linked or not — what holds it back by default is the short
    // `distanceMax`, not the node set — so both are opened up here.
    const roomy = Boolean(anchor);
    // d3's centring force translates every node so the centroid sits at the
    // origin, mutating positions directly and taking no notice of `fx`. With
    // an anchor pinned at the origin the two disagree every tick, and the
    // anchor's pin wins only at integration — so what the tug-of-war actually
    // moves is the *neighbours*, dragged inward toward the centre they are
    // supposed to orbit. It is worst at one neighbour, where the centroid rule
    // wants that neighbour exactly on top of the anchor.
    //
    // An anchored view already has a centre by construction. Drop the force.
    if (roomy) fg.d3Force?.("center", null);
    const charge = fg.d3Force?.("charge");
    if (charge) {
      if (roomy) {
        // The radial force owns the radius, so many-body is left with one job:
        // pushing neighbours apart *around* the ring.
        charge.strength((node: any) =>
          isHubType(node.type) ? ANCHOR_RING.charge * 2.5 : ANCHOR_RING.charge
        );
      } else {
        charge.strength((node: any) =>
          isHubType(node.type) ? (roomy ? -400 : -180) : roomy ? -140 : -45
        );
      }
      charge.distanceMax?.(roomy ? 900 : 280);
    }
    const link = fg.d3Force?.("link");
    if (link) {
      if (roomy) {
        // Links no longer set the radius. Held weakly at the ring radius, they
        // express affinity only: two interlinked neighbours drift together
        // around the ring instead of sitting at arbitrary angles.
        link.distance(anchorGeometry.ringRadius);
        link.strength?.(ANCHOR_RING.linkStrength);
      } else {
        link.distance((edge: any) => {
          const s = typeof edge.source === "object" ? edge.source.type : undefined;
          const t = typeof edge.target === "object" ? edge.target.type : undefined;
          return isHubType(s) || isHubType(t) ? 60 : 35;
        });
      }
    }
    // The ring itself: every neighbour pulled to one radius about the anchor,
    // with its angle left to the simulation so related nodes still drift
    // together.
    fg.d3Force?.(
      "anchorRing",
      roomy ? radialForce(anchorGeometry.ringRadius, ANCHOR_RING.ringStrength) : null
    );
    // Hard separation. Many-body alone lets nodes overlap once links pull them
    // together, which is what makes a force layout look bunched; a collision
    // force gives the neighbourhood a real minimum spacing.
    fg.d3Force?.("anchorCollide", roomy ? collideForce(ANCHOR_RING.minGap) : null);
    fg.d3ReheatSimulation?.();
    // Frame onEngineStop: a wall-clock delay can fire while paused, before
    // the layout has reached its final bounds.
  }, [ForceGraph, graphData, height, anchor, anchorGeometry, visibility.started]);

  // Re-frame when the slot changes width. The fit above runs once the
  // simulation settles and is never revisited, so a canvas that gets narrower
  // afterwards — a window resize, a responsive column switch — keeps framing
  // computed for a viewport it no longer has, and nodes drift out of view.
  // Deliberately separate from the effect above so a resize re-fits without
  // also reheating the simulation and rearranging the layout under the reader.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || width == null) return;
    const timer = window.setTimeout(() => frame(300), 250);
    return () => window.clearTimeout(timer);
  }, [ForceGraph, width, height, anchor, anchorGeometry, visibility.started]);

  return (
    <div
      ref={containerRef}
      className="graph-canvas__surface"
      style={{
        width: "100%",
        height,
        overflow: "hidden",
        position: "relative",
        cursor: dragging ? "grabbing" : hoverIsClickable ? "pointer" : undefined
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        if (!grabRef.current) setHover(null);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={(event) => endDrag(event, false)}
      onPointerCancel={(event) => endDrag(event, true)}
      // A capture lost to a browser gesture — alt-tab, a context menu — never
      // sends pointerup. Without this the pan predicate stays false and the
      // canvas is frozen until reload.
      onLostPointerCapture={(event) => endDrag(event, true)}
      onClick={handleClick}
    >
      {ForceGraph && width != null && visibility.started ? (
        <ForceGraph
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          // Hover, labels and clicks are handled by this component instead of
          // force-graph. Its own hit detection reads back pixels from an
          // off-screen ID-colour canvas, which browsers with canvas
          // fingerprinting protection (Brave by default) perturb — silently
          // killing hover and clicks on a stable subset of nodes. Node drag
          // rides on the same mechanism, and the layout pins hubs on purpose,
          // so it goes too. Zoom/pan are gated separately and still work.
          enablePointerInteraction={false}
          enableNodeDrag={false}
          // Dragging is this component's own (see `handlePointerDown`), built
          // on the same arithmetic hit-testing, so it survives the readback
          // problem above. The pan gate has to yield to it: d3-zoom would
          // otherwise pan the canvas out from under the node being moved.
          enablePanInteraction={allowPan}
          // Mutating `node.fx` marks nothing dirty, and the render loop skips
          // any frame nothing marked — the same mechanism that strands old
          // theme colours on the canvas (see above). A drag on a cooled engine
          // would be invisible. Unpausing for the length of the gesture is the
          // switch the library provides for exactly this.
          autoPauseRedraw={!dragging}
          nodeRelSize={5}
          // d3-force uses `nodeRelSize * sqrt(nodeVal)` as the collision
          // radius (and the auto-size). Giving hubs a larger val widens the
          // empty bubble around each hub so its satellites don't crowd it.
          nodeVal={(node: any) => (isHubType(node.type) ? 6 : 1)}
          // The fixed model has a radius to *reach*, not merely to settle
          // near, so it is given room to get there.
          // An anchored view has a radius to *reach*, not merely to settle
          // near, so it is given room to get there.
          cooldownTicks={anchor ? 300 : 80}
          // The default 15s wall-clock deadline expires even while animation
          // frames are suspended. Only actual simulation ticks should count.
          cooldownTime={Infinity}
          onEngineStop={() => {
            // A drag's reheat runs the full cooldown and then lands here.
            // Re-framing on that would re-centre and re-zoom the view seconds
            // after the reader let go, which reads as the canvas lurching.
            if (skipReframeRef.current) {
              skipReframeRef.current = false;
              return;
            }
            frame(400);
          }}
          linkDirectionalParticles={0}
          // Edges are painted as a batch in `onRenderFramePost`, not one at a
          // time — see `drawEdges`. `linkColor` and `linkWidth` would be dead
          // props under "replace" mode, so the config they used to duplicate is
          // read in that one place instead.
          linkCanvasObjectMode={() => "replace"}
          linkCanvasObject={() => {}}
          // Post, not pre: the frame's simulation tick runs between the two, so
          // drawing beforehand would place edges at the previous tick's
          // positions and let them trail visibly behind a dragged node.
          // `destination-over` puts them back underneath the glyphs.
          onRenderFramePost={(ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            drawEdges(ctx);
            ctx.restore();
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            drawNode(ctx, node, globalScale, {
              selected: selected === node.id,
              anchored: anchor === node.id,
              // The selected node is exempt: see drawSelectedGlow.
              faded: selected !== node.id && !!emphasized && !emphasized.has(node.id),
              labelMode,
              selectedStyle
            });
          }}
        />
      ) : (
        <div className="graph-loading">Loading graph...</div>
      )}
      {showFloatingLabel && hover && (
        <div
          className="graph-tooltip"
          style={{
            left: hover.x,
            top: hover.y,
            transform: labelTransform(hover.x, hover.y, width ?? 0, height)
          }}
        >
          {hover.node.title}
        </div>
      )}
    </div>
  );
}

/**
 * Pull every unpinned node toward a circle of the given radius about the
 * origin — the anchor's pinned position.
 *
 * This is what makes an anchored neighbourhood's radius a *stated* quantity.
 * Without it the radius is an accident of link distance fighting many-body
 * repulsion, which is why it used to move with the neighbour count and take
 * the painted glyph size with it. Dragged and pinned nodes are skipped, so a
 * node the reader placed is not tugged back onto the ring.
 */
function radialForce(radius: number, strength: number) {
  let nodes: any[] = [];
  const force = (alpha: number) => {
    for (const node of nodes) {
      if (node.fx != null) continue;
      const dx = node.x || 1e-6;
      const dy = node.y || 1e-6;
      const distance = Math.hypot(dx, dy);
      const k = ((radius - distance) * strength * alpha) / distance;
      node.vx += dx * k;
      node.vy += dy * k;
    }
  };
  force.initialize = (initial: any[]) => {
    nodes = initial;
  };
  return force;
}

/**
 * Keep nodes from overlapping by moving them apart directly, the way d3's own
 * collide force does. O(n²), which is nothing at the twenty-odd nodes a local
 * neighbourhood holds. Pinned nodes are left where they are.
 */
function collideForce(padding: number) {
  let nodes: any[] = [];
  const force = () => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const minimum = nodePaintedRadius(a) + nodePaintedRadius(b) + padding;
        const distance = Math.hypot(dx, dy) || 1e-6;
        if (distance >= minimum) continue;
        const shift = ((minimum - distance) / distance) * 0.5;
        const ox = dx * shift;
        const oy = dy * shift;
        if (a.fx == null) {
          a.x -= ox;
          a.y -= oy;
        }
        if (b.fx == null) {
          b.x += ox;
          b.y += oy;
        }
      }
    }
  };
  force.initialize = (initial: any[]) => {
    nodes = initial;
  };
  return force;
}

/**
 * Keep the floating label inside the canvas. Horizontally it slides by a
 * fraction of its own width proportional to how far right the cursor is, so it
 * hugs the left edge on the left and the right edge on the right without ever
 * needing to know how wide the text is. Vertically it sits below the cursor,
 * flipping above when there isn't room.
 */
function labelTransform(x: number, y: number, width: number, height: number): string {
  const shiftX = `-${clamp((x / Math.max(1, width)) * 100, 0, 100)}%`;
  const shiftY = height > 130 && height - y < 100 ? "calc(-100% - 6px)" : "21px";
  return `translate(${shiftX}, ${shiftY})`;
}

/**
 * Extent of the settled nodes, or `null` if none have positions yet. Width and
 * height can legitimately be zero — one node, or several in a line — which is
 * precisely the case the fit ceiling exists for.
 */
function boundingBox(nodes: Array<{ x?: number; y?: number }>) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }
  if (minX === Infinity) return null;
  return {
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  globalScale: number,
  state: {
    selected: boolean;
    faded: boolean;
    labelMode: LabelMode;
    selectedStyle: SelectedStyle;
    anchored?: boolean;
  }
) {
  const meta = getEntryType(node.type).graph;
  const radius = nodePaintedRadius(node);
  const color = nodeColor(node.type);
  ctx.save();
  ctx.globalAlpha = state.faded ? FADE_ALPHA : 1;

  if (state.selected && state.selectedStyle === "soft-glow") {
    drawSelectedGlow(ctx, node, radius, color);
  }


  ctx.fillStyle = color;
  ctx.strokeStyle =
    state.selected && state.selectedStyle === "outline" ? cssVar("--color-fg") : cssVar("--color-bg");
  ctx.lineWidth = state.selected && state.selectedStyle === "outline" ? 2.5 : 1;

  if (meta.shape === "square") {
    ctx.beginPath();
    ctx.rect(node.x - radius, node.y - radius, radius * 2, radius * 2);
    ctx.fill();
    ctx.stroke();
  } else if (meta.shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(node.x, node.y - radius);
    ctx.lineTo(node.x + radius, node.y);
    ctx.lineTo(node.x, node.y + radius);
    ctx.lineTo(node.x - radius, node.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (meta.shape === "hexagon") {
    polygon(ctx, node.x, node.y, radius + 1, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  // Punched out on top of the fill it punches through.
  if (state.anchored) {
    drawAnchorCore(ctx, node, radius);
  }

  if (shouldPaintLabel(node, state.labelMode)) {
    const label = node.title;
    const fontSize = Math.min(14, Math.max(9, 11 / globalScale));
    ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = cssVar("--color-fg");
    ctx.textAlign = "center";
    // Floored rather than inherited: the glyph says "not what you filtered
    // for", the name says "you are here", and only the first of those is
    // worth dimming.
    if (state.faded) ctx.globalAlpha = FADED_LABEL_ALPHA;

    const side: "top" | "bottom" = node._labelSide === "bottom" ? "bottom" : "top";
    const offset = radius + 6;
    if (side === "top") {
      ctx.textBaseline = "bottom";
      ctx.fillText(label, node.x, node.y - offset);
    } else {
      ctx.textBaseline = "top";
      ctx.fillText(label, node.x, node.y + offset);
    }
  }
  ctx.restore();
}

/**
 * Mark the anchor node: a small disc of page background punched through the
 * glyph's centre. It leaves the node's shape and colour intact, and reads as
 * annotation rather than as another node state — which matters, because
 * selection already owns the glow.
 */
function drawAnchorCore(ctx: CanvasRenderingContext2D, node: any, radius: number) {
  ctx.save();
  ctx.fillStyle = cssVar("--color-bg");
  ctx.beginPath();
  ctx.arc(node.x, node.y, Math.max(1.5, radius * 0.32), 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Selection is a third axis — what the reader is inspecting — and not a claim
 * about matching anything, so it paints at full strength even when the node
 * under it is faded. Otherwise selecting a node and then filtering it out
 * leaves the preview pane describing something all but invisible.
 */
function drawSelectedGlow(
  ctx: CanvasRenderingContext2D,
  node: any,
  radius: number,
  color: string
) {
  const glowRadius = radius + 4;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Decide whether a node's label should be painted, given the canvas-level
 * `labelMode` override and the per-type `labelVisibility` from
 * `graphConfig.nodeTypes`.
 */
function shouldPaintLabel(node: any, labelMode: LabelMode): boolean {
  if (labelMode === "none") return false;
  if (labelMode === "all") return true;
  // "config": defer to per-type visibility. Treat unknown types as "hover".
  const cfg = (graphConfig.nodeTypes as Record<string, { labelVisibility?: string }>)[node.type];
  return cfg?.labelVisibility === "always";
}

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function nodeColor(type: string): string {
  return resolveColor(getEntryType(type).graph.color);
}

/** Canvas cannot resolve `var(--x)`, so config colours are looked up here. */
function resolveColor(color: string): string {
  const cssVariable = color.match(/^var\((--[^),\s]+)/)?.[1];
  return cssVariable ? cssVar(cssVariable) : color;
}

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#111111";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#111111";
}
