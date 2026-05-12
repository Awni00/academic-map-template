import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { GraphIndex } from "../../lib/graph/types";

type GraphCanvasProps = {
  graph: GraphIndex;
  height?: number;
  selected?: string;
  highlighted?: Set<string>;
  dimUnhighlighted?: boolean;
  labelMode?: "auto" | "hubs" | "none";
  onSelect?: (id: string) => void;
};

type ForceGraphComponent = React.ComponentType<any>;

export default function GraphCanvas({
  graph,
  height = 520,
  selected,
  highlighted,
  dimUnhighlighted = false,
  labelMode = "auto",
  onSelect
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

  const graphData = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.edges.map((edge) => ({ ...edge }))
    }),
    [graph]
  );

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
  }, [ForceGraph, graphData]);

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
  state: { selected: boolean; dimmed: boolean; labelMode: "auto" | "hubs" | "none" }
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

  const shouldLabel = state.labelMode !== "none" && node.type === "hub";
  if (shouldLabel) {
    const label = node.title;
    const fontSize = Math.min(14, Math.max(9, 11 / globalScale));
    ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = cssVar("--color-fg");
    ctx.fillText(label, node.x + radius + 5, node.y);
  }
  ctx.restore();
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
