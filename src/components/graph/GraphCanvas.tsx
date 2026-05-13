import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { graphConfig } from "../../config/graph";
import type { GraphIndex } from "../../lib/graph/types";

type HubLayout = "circle" | "row" | "force";
type LabelMode = "config" | "all" | "none";
type LabelSide = "top" | "bottom" | "auto";

type GraphCanvasProps = {
  graph: GraphIndex;
  height?: number;
  selected?: string;
  highlighted?: Set<string>;
  dimUnhighlighted?: boolean;
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
    const hubs = graph.nodes.filter((node) => node.type === "hub");
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
  }, [graph, hubLayout, height, width, labelSide]);

  // Tune the d3-force simulation so hubs get more personal space than the
  // small entries around them. The default many-body strength is a flat
  // -30 per node; we make hubs noticeably more repulsive, and we lengthen
  // links that touch a hub so the cluster around each hub fans out.
  useEffect(() => {
    if (!ForceGraph || !fgRef.current) return;
    const fg = fgRef.current;
    const charge = fg.d3Force?.("charge");
    if (charge) {
      charge.strength((node: any) => (node.type === "hub" ? -180 : -45));
      charge.distanceMax?.(280);
    }
    const link = fg.d3Force?.("link");
    if (link) {
      link.distance((edge: any) => {
        const s = typeof edge.source === "object" ? edge.source.type : undefined;
        const t = typeof edge.target === "object" ? edge.target.type : undefined;
        return s === "hub" || t === "hub" ? 60 : 35;
      });
    }
    fg.d3ReheatSimulation?.();
    // After the simulation settles, re-frame so pinned hubs + satellites
    // all sit comfortably inside the viewport. Without this the initial
    // auto-fit can clip nodes that the simulation flung outward early on.
    const timer = window.setTimeout(() => {
      // Scale padding to the canvas size so the small per-entry LocalGraph
      // (~190px tall) doesn't end up with most of its height eaten by
      // gutters, while the large main map (~620px) still leaves room for
      // hub labels at its edges.
      const padding = Math.max(12, Math.min(80, Math.round(height * 0.08)));
      fg.zoomToFit?.(400, padding);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ForceGraph, graphData, height]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, overflow: "hidden", position: "relative" }}
    >
      {ForceGraph && width != null ? (
        <ForceGraph
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          nodeRelSize={5}
          // d3-force uses `nodeRelSize * sqrt(nodeVal)` as the collision
          // radius (and the auto-size). Giving hubs a larger val widens the
          // empty bubble around each hub so its satellites don't crowd it.
          nodeVal={(node: any) => (node.type === "hub" ? 6 : 1)}
          nodeLabel={(node: any) => node.title}
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
            ctx.restore();
          }}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            drawNode(ctx, node, globalScale, {
              selected: selected === node.id,
              dimmed: dimUnhighlighted && highlighted ? !highlighted.has(node.id) : false,
              labelMode
            });
          }}
          onNodeClick={(node: any) => onSelect?.(node.id)}
        />
      ) : (
        <div className="graph-loading">Loading graph...</div>
      )}
    </div>
  );
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  globalScale: number,
  state: { selected: boolean; dimmed: boolean; labelMode: LabelMode }
) {
  const radius = node.type === "hub" ? 6 : node.type === "paper" ? 5 : 4;
  const color = nodeColor(node.type);
  ctx.save();
  ctx.globalAlpha = state.dimmed ? 0.18 : 1;
  ctx.fillStyle = color;
  ctx.strokeStyle = state.selected ? cssVar("--color-fg") : cssVar("--color-bg");
  ctx.lineWidth = state.selected ? 2.5 : 1;

  if (node.type === "hub") {
    ctx.beginPath();
    ctx.rect(node.x - radius, node.y - radius, radius * 2, radius * 2);
    ctx.fill();
    ctx.stroke();
  } else if (node.type === "teaching") {
    ctx.beginPath();
    ctx.moveTo(node.x, node.y - radius);
    ctx.lineTo(node.x + radius, node.y);
    ctx.lineTo(node.x, node.y + radius);
    ctx.lineTo(node.x - radius, node.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (node.type === "project") {
    polygon(ctx, node.x, node.y, radius + 1, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
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
  const map: Record<string, string> = {
    hub: "--graph-hub",
    paper: "--graph-paper",
    post: "--graph-post",
    note: "--graph-note",
    teaching: "--graph-teaching",
    project: "--graph-project"
  };
  return cssVar(map[type] ?? "--graph-note");
}

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#111111";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#111111";
}
