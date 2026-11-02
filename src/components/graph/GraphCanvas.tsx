import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { getEntryType, graphConfig, isHubType } from "../../config";
import {
  isTypeInteractive,
  labelVisibilityFor,
  nodeAtPoint,
  nodePaintedRadius,
  resolveLabelSide,
  type HubLayout,
  type LabelSide
} from "../../lib/graph/nodeInteraction";
import {
  ANCHOR_RING,
  computeAnchorGeometry,
  fitPadding
} from "../../lib/graph/anchorLayout";
import {
  centerForce,
  clusterForce,
  hubRepulsionForce,
  parentHubs,
  seedPositions
} from "../../lib/graph/clusterLayout";
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
import { curvedArrow, curvedEdge } from "../../lib/graph/edgeGeometry";
import { arrowMode } from "../../lib/graph/graphSettings";
import {
  placeLabel,
  placeRequiredLabel,
  screenToGraph,
  wrapLabel,
  type Box
} from "../../lib/graph/labelLayout";
import type { GraphIndex } from "../../lib/graph/types";
import type {
  GraphConfigBase,
  GraphForcesConfig,
  GraphHoverConfig,
  GraphSelectionStyle
} from "../../config/types";

type LabelMode = "config" | "all" | "none";
type GraphCanvasProps = {
  graph: GraphIndex;
  height?: number;
  selected?: string;
  /**
   * Nodes to paint at full strength; every other node drops to a single faded
   * tier. `undefined` means nothing is selected and all nodes paint full.
   *
   * Nodes only — the edges underneath keep their weight. A type or tag
   * selection is a claim about node properties, not about structure, and
   * fading the skeleton beneath one would leave a few lit nodes floating in
   * nothing, saying nothing about where they live.
   */
  emphasized?: Set<string>;
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
   *   "none"   — paint none; hovering a node floats its title instead.
   */
  labelMode?: LabelMode;
  /**
   * Drawn in place of the canvas until it mounts: in the server render, and
   * until the canvas scrolls into view. Defaults to a "Loading graph..." line.
   */
  placeholder?: ReactNode;
  /**
   * Side of the node where labels sit. "auto" derives from `hubLayout`.
   */
  labelSide?: LabelSide;
  onSelect?: (id: string) => void;
  /**
   * How hubs are positioned in the simulation.
   *   "cluster" — entries gather round the hub whose folder they live in, and
   *               the hubs settle where the forces put them.
   *   "force"   — let the force simulation place them (default for small
   *               neighbourhoods such as the article-page local map).
   *   "circle"  — pin hubs evenly around a circle.
   *   "row"     — pin hubs in a horizontal row near the top.
   */
  hubLayout?: HubLayout;
  /** Screen pixels kept clear around the fitted graph. */
  fitPad?: number;
  /**
   * Screen pixels along the bottom that something else covers — the phone
   * bottom sheet — so the fit centres the graph in what stays visible.
   */
  bottomInset?: number;
  /**
   * Rectangles of the canvas that something painted over it covers — the
   * legend — in CSS pixels from the canvas's top-left. Labels are placed clear
   * of them, and the fit keeps glyphs out from under any along the top edge.
   */
  obstacles?: Box[];
  /** Show +, −, and fit buttons in the corner of the canvas. */
  zoomControls?: boolean;
  /** What hovering a node does. Defaults to the site's `graph.hover`. */
  hover?: GraphHoverConfig;
  /** How the selected node is marked. Defaults to `graph.selection.style`. */
  selectionStyle?: GraphSelectionStyle;
  /**
   * Overrides for the site's `graph.links`, `graph.layout.forces`, and the
   * entry types' glyph sizes (screen pixels, by type id). Every surface leaves
   * these unset and draws from config; the graph playground fixture sets them
   * to preview settings before they are written into config.
   */
  links?: Partial<GraphConfigBase["links"]>;
  forces?: GraphForcesConfig;
  nodeSizes?: Partial<Record<string, number>>;
};

/**
 * The one de-emphasis level. Deep enough to read as secondary, shallow enough
 * that the graph's skeleton survives — the whole point of fading rather than
 * removing is that the unselected nodes keep holding the structure up.
 */
const FADE_ALPHA = 0.42;
/**
 * Labels are wayfinding, not type membership. Fading a hub's glyph is fine;
 * fading its name off the map costs the reader the only text anchors they
 * have, exactly when a filter has made everything else less familiar.
 */
const FADED_LABEL_ALPHA = 0.6;
/**
 * Opacity of the two selection marks. Tests find the mark on the canvas by
 * these values (tests/e2e/graph-selection.spec.ts), so nothing else may paint
 * an arc at either.
 */
const SELECTION_RING_ALPHA = 0.75;
const SELECTION_HALO_ALPHA = 0.18;
/**
 * Ceiling for the settle-time fit. The scale comes from the node bounding box,
 * which degenerates to a point for a single node and to a line for two. Glyphs
 * keep their size on screen at any zoom, so a high zoom no longer balloons
 * them; this cap only stops two nodes being spread to opposite corners.
 */
const MAX_FIT_ZOOM = 4;
/** Room reserved above the fitted graph for the hub labels painted there. */
const LABEL_HEADROOM = 22;
/** One press of the + or − button. */
const ZOOM_STEP = 1.4;
/**
 * Opacity of everything outside a hovered node's neighbourhood. Deeper than
 * the filter fade: hover is a momentary question ("what is this connected
 * to?") and the answer should stand out, where a filter is a standing state
 * the reader has to keep reading through.
 */
const HOVER_DIM_ALPHA = 0.22;
/** Edges outside a hovered neighbourhood. */
const HOVER_DIM_EDGE_ALPHA = 0.16;
/** Edges touching the hovered or selected node, in the accent colour. */
const LIT_EDGE_ALPHA = 0.85;
/** Edges touching the focused node are this much wider than the rest. */
const LIT_EDGE_WIDTH_RATIO = 1.4;


type ForceGraphComponent = React.ComponentType<any>;

export default function GraphCanvas({
  graph,
  height = 520,
  selected,
  emphasized,
  anchor,
  drag = "none",
  labelMode = "config",
  placeholder,
  labelSide = "auto",
  onSelect,
  hubLayout = "force",
  fitPad,
  bottomInset = 0,
  obstacles,
  zoomControls = false,
  hover: hoverConfig = graphConfig.hover,
  selectionStyle = graphConfig.selection.style,
  links: linkOverrides,
  forces: forceOverrides,
  nodeSizes
}: GraphCanvasProps) {
  const linkStyle = useMemo(() => ({ ...graphConfig.links, ...(linkOverrides ?? {}) }), [linkOverrides]);
  const forceConfig = forceOverrides ?? graphConfig.layout.forces;
  /** Glyph radius in graph units at `scale`, honouring `nodeSizes`. */
  const radiusOf = useCallback(
    (node: any, scale = 1) => {
      const size = node && nodeSizes?.[node.type];
      return size != null ? Math.max(3, size / 2) / scale : nodePaintedRadius(node, scale);
    },
    [nodeSizes]
  );
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
  // Labels for the frame being painted: the boxes already taken, and the hover
  // labels held back to be drawn last, on top of everything (see
  // `drawHoverLabels`). Reset at the start of every frame.
  const labelsRef = useRef<FrameLabels>({ taken: [], glyphs: [], deferred: [], blocked: [] });
  // Read at paint time, so a legend that changes size reaches the next frame
  // without re-creating the canvas callbacks.
  const obstaclesRef = useRef<Box[]>([]);
  obstaclesRef.current = obstacles ?? [];
  // Pixels per graph unit as of the last paint. Glyphs are sized in screen
  // pixels, so hit-testing has to know the zoom to know how big a node is.
  const zoomRef = useRef(1);
  // Parent hub of each node, by folder; the cluster layout's one input beyond
  // the links.
  const parents = useMemo(() => parentHubs(graph.nodes), [graph]);
  const hubIds = useMemo(
    () => new Set(graph.nodes.filter((node) => isHubType(node.type)).map((node) => node.id)),
    [graph]
  );

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

  const resolveSide = (yPos: number | null) => resolveLabelSide(yPos, { labelSide, hubLayout });

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

  // Only the pinned layouts place nodes by the canvas size, so only they should
  // rebuild the node set when it changes. Rebuilding restarts the simulation,
  // and a cluster map would rearrange itself on every window resize.
  const pinBox = hubLayout === "circle" || hubLayout === "row" ? `${width ?? 800}x${height}` : "free";

  const graphData = useMemo(() => {
    const w = width ?? 800;
    const h = height;
    // Folder-aware starting points, so the cluster layout settles the same way
    // on every visit instead of from d3's spiral.
    const seeds = hubLayout === "cluster" && !anchor ? seedPositions(graph.nodes, parents) : null;
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
        const seed = seeds?.get(node.id);
        return { ...node, ...(seed ?? {}), _labelSide: resolveSide(null) };
      }),
      links: graph.edges.map((edge) => ({ ...edge }))
    };
    // `width` and `height` are read through `pinBox`, which changes only when
    // a pinned layout actually depends on them.
  }, [graph, hubLayout, pinBox, labelSide, anchor, parents]);

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

  // Labels are painted in the site's web fonts, and a canvas does not repaint
  // when a font finishes loading. Without this the first frames can settle in
  // the fallback face and keep it until something else invalidates the canvas.
  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setThemeVersion((version) => version + 1);
    });
    return () => {
      active = false;
    };
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
      node: nodeAtPoint(graphData.nodes as any[], graphPoint.x, graphPoint.y, zoomRef.current, (node) =>
        radiusOf(node)
      ),
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

  /** Presses on the zoom buttons belong to the buttons, not to the map. */
  const onControls = (event: { target: EventTarget | null }) =>
    event.target instanceof Element && Boolean(event.target.closest(".graph-zoom"));

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
    if (onControls(event)) return;
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
    if (!onSelect || onControls(event)) return;
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
  // visibility. Where labels are painted, hovering paints the node's own label
  // and its neighbours' on the canvas instead (see `focus`), so a floating
  // copy would only repeat one of them.
  const showFloatingLabel = Boolean(hover && labelMode === "none");

  /** Links per node, for the cluster layout's link strengths. */
  const degree = useMemo(() => {
    const out = new Map<string, number>();
    for (const edge of drawnEdges) {
      out.set(edge.source, (out.get(edge.source) ?? 0) + 1);
      out.set(edge.target, (out.get(edge.target) ?? 0) + 1);
    }
    return out;
  }, [drawnEdges]);

  /** Each node's neighbours, either direction, for the hover highlight. */
  const adjacency = useMemo(() => {
    const out = new Map<string, Set<string>>();
    for (const edge of drawnEdges) {
      if (!out.has(edge.source)) out.set(edge.source, new Set());
      if (!out.has(edge.target)) out.set(edge.target, new Set());
      out.get(edge.source)!.add(edge.target);
      out.get(edge.target)!.add(edge.source);
    }
    return out;
  }, [drawnEdges]);

  /**
   * What the canvas is currently answering "connected to what?" for.
   *
   * Hover asks it of one node: its edges light up and, with `hover.dim`,
   * everything outside the answer fades. A selection asks the same question
   * more quietly — its edges light up, but nothing dims — because a selection
   * lasts, and a map that stays mostly faded for as long as anything is
   * selected is a map that is hard to read. Nothing is dimmed mid-drag, where
   * the cursor is on the node being moved.
   *
   * `named` is which nodes hovering puts a title on, per `hover.labels`.
   */
  const hoverId = !dragging && hover ? (hover.node.id as string) : undefined;
  const focus = useMemo(() => {
    const id = hoverId ?? selected;
    if (!id) return null;
    const near = new Set([id, ...(adjacency.get(id) ?? [])]);
    const named = !hoverId
      ? new Set<string>()
      : hoverConfig.labels === "neighbours"
        ? near
        : hoverConfig.labels === "node"
          ? new Set([hoverId])
          : new Set<string>();
    return { id, dims: Boolean(hoverId) && hoverConfig.dim, near, named };
  }, [hoverId, selected, adjacency, hoverConfig.labels, hoverConfig.dim]);

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
          // Glyphs are sized in screen pixels, so in graph units they depend on
          // the zoom; the ring is planned at the zoom it asks for.
          neighbourRadii: graph.nodes
            .filter((node) => node.id !== anchor)
            .map((node) => radiusOf(node, ANCHOR_RING.scale)),
          anchorRadius: radiusOf(
            graph.nodes.find((node) => node.id === anchor),
            ANCHOR_RING.scale
          )
        }
      ),
    [width, height, graph.nodes, anchor, radiusOf]
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
   * Every edge is one stroked curve. An arrowed edge adds a filled head at
   * each arrowed end, and `curvedArrow` stops the shaft where a head begins,
   * so the two never overlap and the join cannot darken.
   *
   * Widths and glyph radii are screen pixels divided by `scale`, the zoom, so
   * a line is as fine zoomed in as out. A highlighted edge is
   * `LIT_EDGE_WIDTH_RATIO` times `links.width`, so it follows that setting.
   *
   * Edges touching the focused node go in the accent colour, and are painted
   * first: this runs under `destination-over`, where each later draw lands
   * *beneath* what is already there, so first is on top.
   */
  const drawEdges = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      const { width, opacity, arrow } = linkStyle;
      const arrows = arrowMode(linkStyle);
      const edgeColor = resolveColor(linkStyle.color);
      const accent = cssVar("--color-accent");
      const headColor = arrow.color === "edge" ? edgeColor : resolveColor(arrow.color);

      const ring = (path: Path2D, points: { x: number; y: number }[]) => {
        path.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) path.lineTo(points[i].x, points[i].y);
        path.closePath();
      };

      const isLit = (edge: { source: string; target: string }) =>
        Boolean(focus && (edge.source === focus.id || edge.target === focus.id));
      const ordered = focus
        ? [...drawnEdges.filter(isLit), ...drawnEdges.filter((edge) => !isLit(edge))]
        : drawnEdges;

      ctx.save();
      ctx.lineCap = "round";
      for (const edge of ordered) {
        const source = liveNodeById.get(edge.source);
        const target = liveNodeById.get(edge.target);
        if (!source || !target) continue;
        if (typeof source.x !== "number" || typeof target.x !== "number") continue;
        const lit = isLit(edge);
        ctx.globalAlpha = lit ? LIT_EDGE_ALPHA : focus?.dims ? HOVER_DIM_EDGE_ALPHA : opacity;
        const color = lit ? accent : edgeColor;
        const sourceRadius = radiusOf(source, scale);
        const targetRadius = radiusOf(target, scale);

        const lineWidth = (lit ? width * LIT_EDGE_WIDTH_RATIO : width) / scale;
        const curvature = linkStyle.curvature;
        // "highlighted" puts heads on the focused node's edges only, so the map
        // stays quiet until the reader asks about one node.
        const headed = arrows === "always" || (arrows === "highlighted" && lit);
        const shaft = headed
          ? curvedArrow(source, target, {
              sourceRadius,
              targetRadius,
              curvature,
              bidirectional: edge.bidirectional,
              // Heads grow with the line, so a thick edge keeps a visible point.
              arrow: {
                length: (arrow.length * Math.max(1, lineWidth * scale)) / scale,
                width: (arrow.width * Math.max(1, lineWidth * scale)) / scale
              }
            })
          : null;
        const curve = headed ? shaft?.shaft : curvedEdge(source, target, { sourceRadius, targetRadius, curvature });
        if (!curve) continue;
        ctx.beginPath();
        ctx.moveTo(curve.start.x, curve.start.y);
        ctx.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Heads meet the shaft rather than overlapping it (see `curvedArrow`),
        // so filling them separately cannot darken the join.
        if (shaft && shaft.heads.length > 0) {
          const tips = new Path2D();
          for (const head of shaft.heads) ring(tips, head);
          ctx.fillStyle = lit ? accent : headColor;
          ctx.fill(tips);
        }
      }
      ctx.restore();
    },
    [drawnEdges, liveNodeById, focus, linkStyle, radiusOf]
  );

  /**
   * Frame the viewport.
   *
   * Without an anchor, fit every node's bounding box into the canvas, less the
   * padding, the headroom hub labels need above the top row, and anything
   * covering the bottom (`bottomInset`). Glyphs keep their size on screen, so
   * the padding in pixels is all the room they need.
   *
   * With one, there is nothing to fit: the anchor goes dead centre and the
   * zoom is `anchorGeometry`'s, decided before the layout ran. Measuring the
   * layout and scaling it to fill would hand the neighbour count control of
   * how big a node is painted, which is the one thing this view must not do.
   */
  const frame = (duration: number) => {
    const fg = fgRef.current;
    if (!fg || width == null) return;
    const padding = fitPad ?? fitPadding(height);
    const nodes = graphData.nodes as Array<{ id: string; x?: number; y?: number; type?: any }>;
    const anchorNode = anchor ? nodes.find((node) => node.id === anchor) : undefined;
    if (!anchorNode || typeof anchorNode.x !== "number") {
      const box = boundingBox(nodes);
      if (!box) return;
      // Keep the top row of glyphs below anything covering the top edge.
      const covered = Math.max(0, ...(obstacles ?? []).map((box) => box.y1));
      const glyph = Math.max(0, ...nodes.map((node) => radiusOf(node)));
      const headroom = Math.max(LABEL_HEADROOM, covered + glyph + 4 - padding);
      const usableW = width - padding * 2;
      const usableH = height - bottomInset - padding * 2 - headroom;
      const zoom = Math.max(
        0.05,
        Math.min(
          usableW / Math.max(box.w, 1e-6),
          usableH / Math.max(box.h, 1e-6),
          MAX_FIT_ZOOM
        )
      );
      // `centerAt` puts a point at the middle of the whole canvas. Shifting it
      // by half the covered strip, less half the label headroom, centres the
      // graph in the part the reader can actually see.
      const shiftPx = (bottomInset - headroom) / 2;
      fg.centerAt?.(box.cx, box.cy + shiftPx / zoom, duration);
      fg.zoom?.(zoom, duration);
      return;
    }
    fg.centerAt?.(anchorNode.x, anchorNode.y, duration);
    fg.zoom?.(anchorGeometry.zoom, duration);
  };

  function zoomBy(factor: number) {
    const fg = fgRef.current;
    if (!fg?.zoom) return;
    fg.zoom(Math.min(12, Math.max(0.05, fg.zoom() * factor)), 250);
  }

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
    // The cluster layout replaces it too, with a per-node pull that keeps
    // disconnected groups near one another (see `centerForce`).
    const cluster = !roomy && hubLayout === "cluster";
    const forces = forceConfig;
    if (cluster) fg.d3Force?.("center", null);
    fg.d3Force?.(
      "clusterCenter",
      cluster
        ? centerForce(forces.centerPull, (width ?? 800) / Math.max(1, height - bottomInset))
        : null
    );
    fg.d3Force?.(
      "cluster",
      cluster ? clusterForce(parents, forces.groupDistance, forces.groupPull) : null
    );
    fg.d3Force?.(
      "hubRepulsion",
      cluster && forces.hubHubRepulsion > 0
        ? hubRepulsionForce(hubIds, forces.hubHubRepulsion, forces.hubHubRange)
        : null
    );
    const charge = fg.d3Force?.("charge");
    if (charge) {
      if (cluster) {
        charge.strength((node: any) =>
          isHubType(node.type) ? -forces.hubRepulsion : -forces.entryRepulsion
        );
        charge.distanceMax?.(forces.repulsionRange);
      } else if (roomy) {
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
      if (!cluster) charge.distanceMax?.(roomy ? 900 : 280);
    }
    const link = fg.d3Force?.("link");
    if (link) {
      if (roomy) {
        // Links no longer set the radius. Held weakly at the ring radius, they
        // express affinity only: two interlinked neighbours drift together
        // around the ring instead of sitting at arbitrary angles.
        link.distance(anchorGeometry.ringRadius);
        link.strength?.(ANCHOR_RING.linkStrength);
      } else if (cluster) {
        // Inside a group, links hold pages close; between groups they are
        // long and weak, so a citation across topics leans two groups toward
        // each other without dragging a page out of its own. A hub's link to a
        // page outside its folder has settings of its own: on a site whose
        // hubs list their pages rather than contain them, it is the only thing
        // holding a topic together.
        const id = (end: any) => (typeof end === "object" ? end.id : end);
        const together = (edge: any) => {
          const a = id(edge.source);
          const b = id(edge.target);
          return parents.get(a) === b || parents.get(b) === a || (parents.has(a) && parents.get(a) === parents.get(b));
        };
        const toHub = (edge: any) => hubIds.has(id(edge.source)) || hubIds.has(id(edge.target));
        link.distance((edge: any) =>
          together(edge) ? forces.linkLength : toHub(edge) ? forces.hubLinkLength : forces.crossLinkLength
        );
        link.strength?.((edge: any) => {
          const fewest = Math.min(degree.get(id(edge.source)) ?? 1, degree.get(id(edge.target)) ?? 1);
          const strength = together(edge) ? 1 : toHub(edge) ? forces.hubLinkStrength : forces.crossLinkStrength;
          return strength / Math.max(1, fewest);
        });
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
    fg.d3Force?.(
      "anchorCollide",
      roomy
        ? collideForce(ANCHOR_RING.minGap, (node) => radiusOf(node, ANCHOR_RING.scale))
        : cluster
          ? collideForce(forces.minGap, (node) => radiusOf(node))
          : null
    );
    fg.d3ReheatSimulation?.();
    // Frame onEngineStop: a wall-clock delay can fire while paused, before
    // the layout has reached its final bounds.
    // `height` reaches the anchored forces through `anchorGeometry`, and the
    // cluster's aspect ratio is read once per settle; a resize re-frames
    // without re-running the layout (see below).
  }, [ForceGraph, graphData, anchor, anchorGeometry, visibility.started, hubLayout, parents, hubIds, degree, forceConfig, radiusOf]);

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
  }, [ForceGraph, width, height, anchor, anchorGeometry, visibility.started, bottomInset]);

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
          cooldownTicks={anchor ? 300 : hubLayout === "cluster" ? 150 : 80}
          // The cluster layout needs about 300 ticks to settle, which is five
          // seconds of a map sliding about if every one of them is animated.
          // Half run before the first frame, so the map opens nearly composed
          // and only eases the last of the way into place.
          warmupTicks={!anchor && hubLayout === "cluster" ? 150 : 0}
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
          onRenderFramePre={(ctx: CanvasRenderingContext2D) => {
            const transform = ctx.getTransform();
            const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth);
            labelsRef.current = {
              taken: [],
              glyphs: [],
              deferred: [],
              blocked: obstaclesRef.current.map((box) => screenToGraph(box, transform, dpr))
            };
          }}
          onRenderFramePost={(ctx: CanvasRenderingContext2D, globalScale: number) => {
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            drawEdges(ctx, globalScale);
            ctx.restore();
            drawHoverLabels(ctx, globalScale, labelsRef.current);
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            zoomRef.current = globalScale;
            const near = focus?.near.has(node.id) ?? false;
            drawNode(ctx, node, globalScale, {
              selected: selected === node.id,
              anchored: anchor === node.id,
              focused: focus?.id === node.id,
              hovered: hoverId === node.id,
              labels: labelsRef.current,
              // The selected node is exempt: see drawSelectionMark.
              faded: selected !== node.id && !!emphasized && !emphasized.has(node.id),
              dimmed: Boolean(focus?.dims) && !near,
              // Hovering names nodes on the canvas, as `hover.labels` says.
              revealLabel: focus?.named.has(node.id) ?? false,
              labelMode,
              radius: radiusOf(node, globalScale),
              selectionStyle
            });
          }}
        />
      ) : (
        (placeholder ?? <div className="graph-loading">Loading graph...</div>)
      )}
      {zoomControls && ForceGraph && visibility.started && (
        <div className="graph-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
            −
          </button>
          <button type="button" aria-label="Fit the map" onClick={() => frame(400)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </div>
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
          {/* Clamped on an inner element: clamping the padded box itself
              lets a sliver of the next line show in the padding. */}
          <span className="graph-tooltip__text">{hover.node.title}</span>
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
function collideForce(padding: number, radius: (node: any) => number) {
  let nodes: any[] = [];
  const force = () => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const minimum = radius(a) + radius(b) + padding;
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
  scale: number,
  state: {
    selected: boolean;
    faded: boolean;
    /** Outside a hovered node's neighbourhood. */
    dimmed: boolean;
    /** The hovered or selected node itself. */
    focused: boolean;
    /** Under the pointer right now. */
    hovered: boolean;
    labels: FrameLabels;
    /** Paint this node's label even where its type is hover-only. */
    revealLabel: boolean;
    labelMode: LabelMode;
    anchored?: boolean;
    /** Glyph radius in graph units at this zoom. */
    radius: number;
    selectionStyle: GraphSelectionStyle;
  }
) {
  const meta = getEntryType(node.type).graph;
  // Every size below is screen pixels over `scale`, so the glyph, its outline,
  // and its label hold their size at any zoom.
  const px = 1 / scale;
  const radius = state.radius;
  const color = nodeColor(node.type);
  // The halo sits behind the glyph, so it is drawn first; the ring sits on it.
  if (state.selected && state.selectionStyle === "halo") {
    drawSelectionMark(ctx, node, radius, px, "halo", color);
  }
  ctx.save();
  ctx.globalAlpha = state.dimmed ? HOVER_DIM_ALPHA : state.faded ? FADE_ALPHA : 1;

  ctx.fillStyle = color;
  ctx.strokeStyle = cssVar("--color-bg-soft");
  ctx.lineWidth = 1.25 * px;
  ctx.beginPath();
  if (meta.shape === "square") {
    // Rounded: a hub is a soft block, not a hard tile. NodeIcon matches.
    roundedSquare(ctx, node.x, node.y, radius);
  } else if (meta.shape === "diamond") {
    ctx.moveTo(node.x, node.y - radius);
    ctx.lineTo(node.x + radius, node.y);
    ctx.lineTo(node.x, node.y + radius);
    ctx.lineTo(node.x - radius, node.y);
    ctx.closePath();
  } else if (meta.shape === "hexagon") {
    polygon(ctx, node.x, node.y, radius, 6);
  } else {
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  }
  ctx.fill();
  ctx.stroke();

  // Punched out on top of the fill it punches through.
  if (state.anchored) {
    drawAnchorCore(ctx, node, radius);
  }
  ctx.restore();

  if (state.selected && state.selectionStyle === "ring") {
    drawSelectionMark(ctx, node, radius, px, "ring", color);
  }

  state.labels.glyphs.push({
    id: node.id,
    x0: node.x - radius,
    x1: node.x + radius,
    y0: node.y - radius,
    y1: node.y + radius
  });
  if (state.labelMode === "none") return;
  // Floored rather than inherited: the glyph says "not what you filtered for",
  // the name says "you are here", and only the first of those is worth dimming.
  const alpha = state.dimmed ? HOVER_DIM_ALPHA * 2 : state.faded ? FADED_LABEL_ALPHA : 1;
  const hub = labelVisibilityFor(node.type) === "always";
  const always = shouldPaintLabel(node, state.labelMode);
  if (hub && always) {
    paintLabel(ctx, node, radius, px, LABEL_STYLES.hub, alpha, state.labels);
  } else if (state.hovered) {
    state.labels.deferred.push({ node, radius, kind: "focus" });
  } else if (state.selected) {
    paintLabel(ctx, node, radius, px, LABEL_STYLES.focus, alpha, state.labels);
  } else if (state.revealLabel) {
    state.labels.deferred.push({ node, radius, kind: "neighbour" });
  } else if (always) {
    paintLabel(ctx, node, radius, px, LABEL_STYLES.neighbour, alpha, state.labels);
  }
}

type LabelStyle = {
  size: number;
  weight: number;
  family: "--font-body" | "--font-ui";
  color: "--color-fg" | "--color-fg-soft";
  /** Widest line, in screen pixels, before the title wraps. */
  maxWidth: number;
  maxLines: number;
  /** Clear space between the glyph and the label, in screen pixels. */
  gap: number;
};

type FrameLabels = {
  taken: Box[];
  /** Every glyph painted this frame, so hover labels can avoid covering one. */
  glyphs: (Box & { id: string })[];
  deferred: { node: any; radius: number; kind: "focus" | "neighbour" }[];
  /** `obstacles`, in graph units for this frame. No label goes on one. */
  blocked: Box[];
};

/**
 * How each kind of label is set — three styles, one treatment.
 *
 * Hubs are set in the body serif, like the site's headings: they name topics,
 * and are the map's few permanent words. The node in focus — hovered or
 * selected — gets its whole title, wrapped to a short block, in the full text
 * colour. Its neighbours get one line each in the softer colour, cut with an
 * ellipsis: context for the focused node, not titles to read in full, and
 * dropped where they would land on another label or glyph.
 */
const LABEL_STYLES = {
  hub: { size: 14, weight: 600, family: "--font-body", color: "--color-fg", maxWidth: 190, maxLines: 2, gap: 8 },
  focus: { size: 12.5, weight: 500, family: "--font-ui", color: "--color-fg", maxWidth: 200, maxLines: 3, gap: 7 },
  neighbour: { size: 11.5, weight: 400, family: "--font-ui", color: "--color-fg-soft", maxWidth: 150, maxLines: 1, gap: 6 }
} as const satisfies Record<string, LabelStyle>;

const LINE_HEIGHT = 1.28;
/**
 * Every label sits on a plate of the canvas colour, slightly translucent, a
 * few pixels larger than the text, with no border or shadow: it reads as the
 * canvas making room for the words rather than as an object of its own. A
 * per-letter halo was enough for one short line, but a wrapped title leaves
 * gaps between its lines and words, and an edge running through those reads
 * as a strikethrough.
 */
const PLATE_PAD_X = 4;
const PLATE_PAD_Y = 2;
const PLATE_ALPHA = 0.9;
/** Clear space kept between a label and the canvas edge. */
const LABEL_MARGIN = 6;

/** The part of the graph the canvas currently shows, in graph units. */
function viewBox(ctx: CanvasRenderingContext2D): Box {
  const m = ctx.getTransform();
  return {
    x0: -m.e / m.a,
    x1: (ctx.canvas.width - m.e) / m.a,
    y0: -m.f / m.d,
    y1: (ctx.canvas.height - m.f) / m.d
  };
}

/**
 * Paint a node's title: wrapped to the style's width, placed above the node
 * (below it near the top edge), kept inside the canvas, and — with `taken` —
 * dropped if every position would collide with a label already placed.
 * Returns whether it was painted.
 */
function paintLabel(
  ctx: CanvasRenderingContext2D,
  node: any,
  radius: number,
  px: number,
  style: LabelStyle,
  alpha: number,
  labels: FrameLabels,
  avoid = false
): boolean {
  const family = cssVar(style.family, "ui-sans-serif, system-ui, sans-serif");
  ctx.save();
  ctx.font = `${style.weight} ${style.size * px}px ${family}`;
  const lines = wrapLabel(node.title, (text) => ctx.measureText(text).width, style.maxWidth * px, style.maxLines);
  const lineHeight = style.size * LINE_HEIGHT * px;
  const padX = PLATE_PAD_X * px;
  const padY = PLATE_PAD_Y * px;
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + padX * 2;
  const height = lines.length * lineHeight + padY * 2;
  const options = {
    radius,
    gap: style.gap * px,
    margin: LABEL_MARGIN * px,
    view: viewBox(ctx),
    prefer: node._labelSide === "bottom" ? ("below" as const) : undefined
  };
  const box = avoid
    ? placeLabel(node, { width, height }, {
        ...options,
        taken: [...labels.taken, ...labels.glyphs.filter((glyph) => glyph.id !== node.id), ...labels.blocked]
      })
    : placeRequiredLabel(node, { width, height }, options, labels.blocked);
  if (!box) {
    ctx.restore();
    return false;
  }
  labels.taken.push(box);

  ctx.save();
  ctx.globalAlpha = alpha * PLATE_ALPHA;
  ctx.fillStyle = cssVar("--color-bg-soft");
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(box.x0, box.y0, width, height, 3 * px);
  else ctx.rect(box.x0, box.y0, width, height);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = alpha;

  // Lines run from the edge nearest the node, so the text baseline faces it:
  // a label above is set from its bottom line up, one below from its top down.
  const above = box.y1 <= node.y;
  const cx = (box.x0 + box.x1) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = above ? "bottom" : "top";
  ctx.fillStyle = cssVar(style.color);
  lines.forEach((line, index) => {
    const y = above
      ? box.y1 - padY - (lines.length - 1 - index) * lineHeight
      : box.y0 + padY + index * lineHeight;
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
  return true;
}

/**
 * The labels hovering adds, drawn after every node and edge so they sit on top:
 * the hovered node's title first, so it always shows, then its neighbours',
 * nearest first, each skipped if it would land on a label or glyph already
 * placed.
 */
function drawHoverLabels(ctx: CanvasRenderingContext2D, scale: number, labels: FrameLabels) {
  if (labels.deferred.length === 0) return;
  const px = 1 / scale;
  const focus = labels.deferred.find((item) => item.kind === "focus");
  if (focus) paintLabel(ctx, focus.node, focus.radius, px, LABEL_STYLES.focus, 1, labels);
  const origin = focus?.node;
  const neighbours = labels.deferred
    .filter((item) => item.kind === "neighbour")
    .sort((a, b) =>
      origin
        ? Math.hypot(a.node.x - origin.x, a.node.y - origin.y) - Math.hypot(b.node.x - origin.x, b.node.y - origin.y)
        : 0
    );
  for (const item of neighbours) {
    paintLabel(ctx, item.node, item.radius, px, LABEL_STYLES.neighbour, 1, labels, true);
  }
}

function roundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const corner = radius * 0.36;
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x - radius, y - radius, radius * 2, radius * 2, corner);
    return;
  }
  ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
}

/**
 * Mark the anchor node: a small disc of page background punched through the
 * glyph's centre. It leaves the node's shape and colour intact, and reads as
 * annotation rather than as another node state — which matters, because
 * selection already owns the ring.
 */
function drawAnchorCore(ctx: CanvasRenderingContext2D, node: any, radius: number) {
  ctx.save();
  ctx.fillStyle = cssVar("--color-bg");
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius * 0.32, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Mark the selected node, as `graph.selection.style` says: a translucent halo
 * in the node's own colour behind the glyph, or a fine dark ring around it.
 *
 * Selection is a third axis — what the reader is inspecting — and not a claim
 * about matching anything, so it paints at full strength even when the node
 * under it is faded. Otherwise selecting a node and then filtering it out
 * leaves the panel describing something all but invisible.
 */
function drawSelectionMark(
  ctx: CanvasRenderingContext2D,
  node: any,
  radius: number,
  px: number,
  style: GraphSelectionStyle,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  if (style === "halo") {
    ctx.globalAlpha = SELECTION_HALO_ALPHA;
    ctx.fillStyle = color;
    ctx.arc(node.x, node.y, radius + 6 * px, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.globalAlpha = SELECTION_RING_ALPHA;
    ctx.strokeStyle = cssVar("--color-fg");
    ctx.lineWidth = 1.25 * px;
    ctx.arc(node.x, node.y, radius + 4 * px, 0, 2 * Math.PI);
    ctx.stroke();
  }
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

function cssVar(name: string, fallback = "#111111"): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
