import { useMemo } from "react";

import type { EntryType, GraphIndex, EntryNode } from "../../lib/graph/types";
import { writingFocusUrl } from "../../lib/routes/paths";
import GraphCanvas from "./GraphCanvas";

type FilterConfig =
  | { mode: "all" }
  | { mode: "types"; types?: EntryType[] }
  | { mode: "neighborhood"; roots?: "hubs" | EntryType[]; depth?: number; perRoot?: number };

type GraphPreviewProps = {
  graph: GraphIndex;
  title: string;
  description: string;
  clickTarget: string;
  filter?: FilterConfig;
  maxNodes?: number;
  mode?: "panel" | "strip";
};

export default function GraphPreview({
  graph,
  title,
  description,
  clickTarget,
  filter = { mode: "all" },
  maxNodes = 24,
  mode = "panel"
}: GraphPreviewProps) {
  const previewGraph = useMemo(
    () => buildPreviewGraph(graph, filter, maxNodes),
    [graph, filter, maxNodes]
  );

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
        <a className="cta" href={clickTarget}>
          Open full map →
        </a>
      </div>
      <div className="graph-preview__body">
        <GraphCanvas
          graph={previewGraph}
          height={280}
          hubLayout="circle"
          labelMode="config"
        />
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

/* ── filtering ────────────────────────────────────────────────────────── */

function buildPreviewGraph(
  graph: GraphIndex,
  filter: FilterConfig,
  maxNodes: number
): GraphIndex {
  let nodes: EntryNode[];

  if (filter.mode === "types" && filter.types?.length) {
    const allowedTypes = new Set(filter.types);
    nodes = graph.nodes.filter((node) => allowedTypes.has(node.type));
  } else if (filter.mode === "neighborhood") {
    nodes = neighborhoodNodes(graph, filter);
  } else {
    nodes = graph.nodes.slice();
  }

  nodes = nodes.slice(0, maxNodes);
  const allowed = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((e) => allowed.has(e.source) && allowed.has(e.target));
  return { ...graph, nodes, edges };
}

function neighborhoodNodes(
  graph: GraphIndex,
  filter: { roots?: "hubs" | EntryType[]; depth?: number; perRoot?: number }
): EntryNode[] {
  const depth = filter.depth ?? 1;
  const perRoot = filter.perRoot ?? 3;

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const roots: EntryNode[] =
    filter.roots === "hubs" || filter.roots === undefined
      ? graph.hubs
      : graph.nodes.filter((n) => (filter.roots as EntryType[]).includes(n.type));

  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }

  const picked = new Map<string, EntryNode>();
  for (const root of roots) picked.set(root.id, root);

  let frontier = roots.map((r) => r.id);
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const rootId of frontier) {
      const neighbors = (adj.get(rootId) ?? [])
        .filter((id) => !picked.has(id))
        .sort()
        .slice(0, perRoot);
      for (const nbId of neighbors) {
        const node = nodeById.get(nbId);
        if (node) {
          picked.set(nbId, node);
          next.push(nbId);
        }
      }
    }
    frontier = next;
  }

  const hubIds = new Set(graph.hubs.map((h) => h.id));
  return Array.from(picked.values()).sort((a, b) => {
    const ah = hubIds.has(a.id) ? 0 : 1;
    const bh = hubIds.has(b.id) ? 0 : 1;
    if (ah !== bh) return ah - bh;
    return a.id.localeCompare(b.id);
  });
}
