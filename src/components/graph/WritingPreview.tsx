import { useMemo } from "react";

import type { EntryType, GraphIndex, EntryNode } from "../../lib/graph/types";
import { writingFocusUrl } from "../../lib/routes/paths";
import GraphCanvas from "./GraphCanvas";

/**
 * The "Explore Writing" widget that sits on the homepage below the hero.
 * Acts as a hand-off into the full writing map at `clickTarget` (typically
 * `/writing`).
 *
 * Two view modes, picked per-viewport:
 *   "graph"       — interactive force-directed preview rendered by
 *                   `GraphCanvas`. Shows a subset of the full graph chosen
 *                   by the `filter` prop (see below).
 *   "topic-cards" — a quiet grid of hub-only links. Same content as the
 *                   graph's hubs, no canvas. Cheaper to render and friendlier
 *                   on narrow viewports.
 *
 * The widget always renders both subtrees and lets CSS toggle visibility
 * at the 680px breakpoint based on the `desktopMode` and `mobileMode` props
 * (which arrive from `siteConfig.homepage.writingPreview` via HomeLayout).
 * The heavy graph canvas is only mounted when at least one of the two modes
 * is `"graph"` — config readers who want a cards-only widget pay nothing
 * for `react-force-graph-2d`.
 *
 * Three `filter` strategies select which nodes feed into the graph view:
 *   `{ mode: "all" }`           — every node in the graph.
 *   `{ mode: "types", types }`  — keep only nodes whose type is in `types`.
 *   `{ mode: "neighborhood", roots, depth, perRoot }`
 *                               — BFS from `roots` ("hubs" or a list of
 *                                 EntryTypes), expanding `depth` levels and
 *                                 taking up to `perRoot` neighbors per node
 *                                 at each level. Both `depth` and `perRoot`
 *                                 accept `null` to mean "unbounded".
 *
 * `maxNodes` is the final hard cap applied after filtering; `null` means
 * "no cap". The topic-cards view ignores `filter` and `maxNodes` — it
 * always shows `graph.hubs`.
 */

export type WritingPreviewMode = "graph" | "topic-cards";

export type FilterConfig =
  | { mode: "all" }
  | { mode: "types"; types?: EntryType[] }
  | {
      mode: "neighborhood";
      roots?: "hubs" | EntryType[];
      depth?: number | null;
      perRoot?: number | null;
    };

export type WritingPreviewProps = {
  graph: GraphIndex;
  title: string;
  description: string;
  /** Where the "Open full map →" CTA navigates. Typically `/writing`. */
  clickTarget: string;
  /** Which nodes feed the graph view. See top-of-file comment for modes. */
  filter?: FilterConfig;
  /** Hard cap on nodes in the graph view, applied after `filter`. `null` = no cap. */
  maxNodes?: number | null;
  /** Pixel height of the graph canvas slot. Ignored in topic-cards mode. */
  previewHeight?: number;
  /** View to render at viewports wider than 680px. */
  desktopMode?: WritingPreviewMode;
  /** View to render at viewports ≤680px. */
  mobileMode?: WritingPreviewMode;
};

export default function WritingPreview({
  graph,
  title,
  description,
  clickTarget,
  filter = { mode: "all" },
  maxNodes = 24,
  previewHeight = 280,
  desktopMode = "graph",
  mobileMode = "topic-cards"
}: WritingPreviewProps) {
  const previewGraph = useMemo(
    () => buildPreviewGraph(graph, filter, maxNodes),
    [graph, filter, maxNodes]
  );

  const needsGraph = desktopMode === "graph" || mobileMode === "graph";
  const needsCards = desktopMode === "topic-cards" || mobileMode === "topic-cards";

  const rootClass = [
    "writing-preview",
    `writing-preview--desktop-${desktopMode}`,
    `writing-preview--mobile-${mobileMode}`
  ].join(" ");

  return (
    <section className={rootClass}>
      <header className="writing-preview__header">
        <div>
          <strong>{title}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {description}
          </p>
        </div>
        <a className="cta" href={clickTarget}>
          Open full map →
        </a>
      </header>

      {needsGraph && (
        <div className="writing-preview__graph">
          <GraphCanvas
            graph={previewGraph}
            height={previewHeight}
            hubLayout="circle"
            labelMode="config"
          />
        </div>
      )}

      {needsCards && (
        <div className="writing-preview__cards">
          {graph.hubs.map((hub) => (
            <a className="topic-card" href={writingFocusUrl(hub.id)} key={hub.id}>
              <strong>{hub.title}</strong>
              {hub.summary && <p className="muted">{hub.summary}</p>}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── filtering ────────────────────────────────────────────────────────── */

/**
 * Apply the configured `filter` then truncate to `maxNodes`. Edges are
 * filtered to keep only those whose endpoints both survive the node cut.
 */
function buildPreviewGraph(
  graph: GraphIndex,
  filter: FilterConfig,
  maxNodes: number | null
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

  if (maxNodes !== null) nodes = nodes.slice(0, maxNodes);
  const allowed = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((e) => allowed.has(e.source) && allowed.has(e.target));
  return { ...graph, nodes, edges };
}

/**
 * BFS outward from a set of root nodes, picking up to `perRoot` neighbors
 * at each level and continuing for `depth` levels. `depth: null` traverses
 * the connected component; `perRoot: null` keeps all neighbors at each step.
 * Returns nodes sorted hubs-first, then by id (stable across renders).
 */
function neighborhoodNodes(
  graph: GraphIndex,
  filter: {
    roots?: "hubs" | EntryType[];
    depth?: number | null;
    perRoot?: number | null;
  }
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

  // `depth: null` means "no depth bound" — terminate when the frontier
  // is empty rather than when a counter expires.
  const maxDepth = filter.depth === null ? graph.nodes.length : depth;
  let frontier = roots.map((r) => r.id);
  for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const rootId of frontier) {
      const candidates = (adj.get(rootId) ?? []).filter((id) => !picked.has(id)).sort();
      const neighbors = filter.perRoot === null ? candidates : candidates.slice(0, perRoot);
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
