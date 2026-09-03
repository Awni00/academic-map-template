import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getEntryType, graphConfig, isHubType } from "../../config";
import {
  isTypeInteractive,
  labelVisibilityFor,
  nodeAtPoint,
  nodePaintedRadius
} from "../../lib/graph/nodeInteraction";
import type { GraphIndex } from "../../lib/graph/types";

/** Pointer travel (px) above which a press counts as a pan, not a click. */
const DRAG_CLICK_TOLERANCE_PX = 5;

type HubLayout = "circle" | "row" | "force";
type LabelMode = "config" | "all" | "none";
type LabelSide = "top" | "bottom" | "auto";
type SelectedStyle = "outline" | "soft-glow";
type GraphCanvasProps = {
  graph: GraphIndex;
  height?: number;
  selected?: string;
  highlighted?: Set<string>;
  dimUnhighlighted?: boolean;
  selectedStyle?: SelectedStyle;
  /**
   * The node this view is *about* — the page you are on. Marked persistently
   * and independently of `selected`, which moves as the reader inspects
   * neighbours; without it the two meanings collapse and "where am I" is lost
   * the moment anything else is clicked.
   */
  anchor?: string;
  /**
   * Which painted labels to draw.
   *   "config" — honour `graphConfig.nodeTypes.{type}.labelVisibility`.
   *   "all"    — paint every node's label.
   *   "none"   — paint none (used by the small per-entry LocalGraph).
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
   *              neighbourhoods such as the article-page LocalGraph).
   *   "circle" — pin hubs evenly around a circle.
   *   "row"    — pin hubs in a horizontal row near the top.
   */
  hubLayout?: HubLayout;
};

type ForceGraphComponent = React.ComponentType<any>;

export default function GraphCanvas({
  graph,
  height = 520,
  selected,
  highlighted,
  dimUnhighlighted = false,
  selectedStyle = "outline",
  anchor,
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
  // Node under the cursor, plus the pointer position (container px) used to
  // place the floating label. `null` when the pointer is over empty canvas.
  const [hover, setHover] = useState<{ node: any; x: number; y: number } | null>(null);
  // Where the current press started, so a pan doesn't register as a click.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
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
    return { node: nodeAtPoint(graphData.nodes as any[], graphPoint.x, graphPoint.y), point };
  };

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const hit = nodeUnderEvent(event);
    if (!hit) return;
    // Skip the state churn when the pointer is idling over empty canvas.
    if (!hit.node && !hover) return;
    setHover(hit.node ? { node: hit.node, x: hit.point.x, y: hit.point.y } : null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pressRef.current = { x: event.clientX, y: event.clientY };
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
   * Frame the viewport.
   *
   * Without an anchor, fit every node's bounding box. With one, fit a box
   * centred on the anchor whose half-extents reach the furthest node: that
   * puts the anchor dead centre by construction, where a bounding-box fit
   * centres the *neighbourhood* and lets the anchor drift off-centre whenever
   * its neighbours are lopsided. The cost is empty space on the sparser side.
   */
  const frame = (duration: number) => {
    const fg = fgRef.current;
    if (!fg || width == null) return;
    const padding = fitPadding(height);
    const nodes = graphData.nodes as Array<{ id: string; x?: number; y?: number; type?: any }>;
    const anchorNode = anchor ? nodes.find((node) => node.id === anchor) : undefined;
    if (!anchorNode || typeof anchorNode.x !== "number") {
      fg.zoomToFit?.(duration, padding);
      return;
    }
    let halfWidth = 1;
    let halfHeight = 1;
    for (const node of nodes) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      const margin = nodePaintedRadius(node);
      halfWidth = Math.max(halfWidth, Math.abs(node.x - anchorNode.x) + margin);
      halfHeight = Math.max(halfHeight, Math.abs(node.y - (anchorNode.y ?? 0)) + margin);
    }
    fg.centerAt?.(anchorNode.x, anchorNode.y, duration);
    fg.zoom?.(
      Math.min((width / 2 - padding) / halfWidth, (height / 2 - padding) / halfHeight),
      duration
    );
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
    const charge = fg.d3Force?.("charge");
    if (charge) {
      charge.strength((node: any) =>
        isHubType(node.type) ? (roomy ? -400 : -180) : roomy ? -140 : -45
      );
      charge.distanceMax?.(roomy ? 900 : 280);
    }
    const link = fg.d3Force?.("link");
    if (link) {
      link.distance((edge: any) => {
        const s = typeof edge.source === "object" ? edge.source.type : undefined;
        const t = typeof edge.target === "object" ? edge.target.type : undefined;
        return isHubType(s) || isHubType(t) ? 60 : 35;
      });
    }
    // Gather the neighbours toward a common radius, leaving their angles to
    // the simulation so related nodes still drift together.
    // Hard separation. Many-body alone lets nodes overlap once links pull them
    // together, which is what makes a force layout look bunched; a collision
    // force gives the neighbourhood a real minimum spacing.
    fg.d3Force?.("anchorCollide", roomy ? collideForce(10) : null);
    fg.d3ReheatSimulation?.();
    // After the simulation settles, re-frame so pinned hubs + satellites
    // all sit comfortably inside the viewport. Without this the initial
    // auto-fit can clip nodes that the simulation flung outward early on.
    const timer = window.setTimeout(() => frame(400), 600);
    return () => window.clearTimeout(timer);
  }, [ForceGraph, graphData, height, anchor]);

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
  }, [ForceGraph, width, height, anchor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        overflow: "hidden",
        position: "relative",
        cursor: hoverIsClickable ? "pointer" : undefined
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHover(null)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {ForceGraph && width != null ? (
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
          nodeRelSize={5}
          // d3-force uses `nodeRelSize * sqrt(nodeVal)` as the collision
          // radius (and the auto-size). Giving hubs a larger val widens the
          // empty bubble around each hub so its satellites don't crowd it.
          nodeVal={(node: any) => (isHubType(node.type) ? 6 : 1)}
          cooldownTicks={80}
          linkDirectionalParticles={0}
          linkColor={() => cssVar("--graph-edge")}
          linkWidth={() => 1}
          linkCanvasObjectMode={() => "replace"}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
            const source = link.source;
            const target = link.target;
            if (!source || !target) return;
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = cssVar("--graph-edge");
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            if (graphConfig.links.directed) {
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const len = Math.hypot(dx, dy);
              if (len > 0) {
                const ux = dx / len;
                const uy = dy / len;
                const radius = nodePaintedRadius(target);
                const { length: aLen, width: aWidth, relPos, color: aColor } = graphConfig.links.arrow;
                const boundaryDist = len - radius;
                if (boundaryDist > 0) {
                  const tipDistFromSource = boundaryDist * relPos;
                  const tipX = source.x + ux * tipDistFromSource;
                  const tipY = source.y + uy * tipDistFromSource;
                  const baseX = tipX - ux * aLen;
                  const baseY = tipY - uy * aLen;
                  const px = -uy;
                  const py = ux;
                  ctx.beginPath();
                  ctx.moveTo(tipX, tipY);
                  ctx.lineTo(baseX + px * aWidth, baseY + py * aWidth);
                  ctx.lineTo(baseX - px * aWidth, baseY - py * aWidth);
                  ctx.closePath();
                  ctx.fillStyle = aColor === "edge" ? cssVar("--graph-edge") : aColor;
                  ctx.fill();
                }
              }
            }
            ctx.restore();
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            drawNode(ctx, node, globalScale, {
              selected: selected === node.id,
              anchored: anchor === node.id,
              dimmed: dimUnhighlighted && highlighted ? !highlighted.has(node.id) : false,
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
 * Padding for `zoomToFit`, scaled to the canvas size so the small per-entry
 * LocalGraph (~190px tall) doesn't end up with most of its height eaten by
 * gutters, while the large main map (~620px) still leaves room for hub labels
 * at its edges.
 */
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

function fitPadding(height: number): number {
  return Math.max(12, Math.min(80, Math.round(height * 0.08)));
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  globalScale: number,
  state: {
    selected: boolean;
    dimmed: boolean;
    labelMode: LabelMode;
    selectedStyle: SelectedStyle;
    anchored?: boolean;
  }
) {
  const meta = getEntryType(node.type).graph;
  const radius = nodePaintedRadius(node);
  const color = nodeColor(node.type);
  ctx.save();
  ctx.globalAlpha = state.dimmed ? 0.18 : 1;

  if (state.selected && state.selectedStyle === "soft-glow") {
    drawSelectedGlow(ctx, node, radius, color, state.dimmed);
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

function drawSelectedGlow(
  ctx: CanvasRenderingContext2D,
  node: any,
  radius: number,
  color: string,
  dimmed: boolean
) {
  const glowRadius = radius + 4;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = dimmed ? 0.05 : 0.18;
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
  const color = getEntryType(type).graph.color;
  const cssVariable = color.match(/^var\((--[^),\s]+)/)?.[1];
  return cssVariable ? cssVar(cssVariable) : color;
}

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#111111";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#111111";
}
