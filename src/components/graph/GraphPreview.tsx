import { useMemo } from "react";

import type { EntryType, GraphIndex } from "../../lib/graph/types";
import { writingFocusUrl } from "../../lib/routes/paths";

type GraphPreviewProps = {
  graph: GraphIndex;
  title: string;
  description: string;
  clickTarget: string;
  filter?: {
    mode: "all" | "types";
    types?: EntryType[];
  };
  maxNodes?: number;
  /**
   * "panel" — full preview with header, decorative graph SVG, and topic cards.
   * "strip" — quiet topic-card row with a small graph thumbnail; meant for the
   * bottom of the homepage as a hand-off into /writing.
   */
  mode?: "panel" | "strip";
};

export default function GraphPreview({
  graph,
  title,
  description,
  clickTarget,
  filter = { mode: "all" },
  maxNodes = 30,
  mode = "panel"
}: GraphPreviewProps) {
  const previewGraph = useMemo(() => {
    const filtered =
      filter.mode === "types" && filter.types?.length
        ? graph.nodes.filter((node) => filter.types?.includes(node.type))
        : graph.nodes;
    const nodes = filtered.slice(0, maxNodes);
    const allowed = new Set(nodes.map((node) => node.id));
    return {
      ...graph,
      nodes,
      edges: graph.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
    };
  }, [filter, graph, maxNodes]);

  if (mode === "strip") {
    return (
      <section className="graph-preview graph-preview--strip">
        <div className="topic-cards topic-cards--always">
          {graph.hubs.map((hub) => (
            <a className="topic-card" href={writingFocusUrl(hub.id)} key={hub.id}>
              <strong>{hub.title}</strong>
              {hub.summary && <p className="muted">{hub.summary}</p>}
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="graph-preview">
      <div className="graph-preview__header">
        <div>
          <strong>{title}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {description}
          </p>
        </div>
        <a className="button button--primary" href={clickTarget}>
          Open map
        </a>
      </div>
      <div className="graph-preview__body" aria-hidden="true">
        <StaticPreview graph={previewGraph} />
      </div>
      <div className="topic-cards">
        {graph.hubs.map((hub) => (
          <a className="topic-card" href={writingFocusUrl(hub.id)} key={hub.id}>
            <strong>{hub.title}</strong>
            {hub.summary && <p className="muted">{hub.summary}</p>}
          </a>
        ))}
      </div>
    </section>
  );
}

function StaticPreview({ graph }: { graph: GraphIndex }) {
  const positions = graph.nodes.map((node, index) => {
    const layout = [
      { x: 38, y: 50 },
      { x: 35, y: 28 },
      { x: 35, y: 72 },
      { x: 62, y: 38 },
      { x: 62, y: 62 }
    ];
    return { ...node, ...(layout[index % layout.length] ?? layout[0]) };
  });
  const byId = new Map(positions.map((node) => [node.id, node]));
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Writing graph preview">
      {graph.edges.map((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return null;
        return (
          <line
            key={`${edge.source}-${edge.target}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="var(--graph-edge)"
            strokeWidth="0.7"
          />
        );
      })}
      {positions.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 3.2} y={node.y - 3.2} width="6.4" height="6.4" fill="var(--graph-hub)" />
          <text x={node.x + 5.2} y={node.y + 1.5} fontSize="4" fill="var(--color-fg)">
            {node.title}
          </text>
        </g>
      ))}
    </svg>
  );
}
