import { useEffect, useMemo, useState } from "react";

import {
  entryTypeDefinitions,
  getEntryType,
  graphConfig,
  writingConfig,
  type EntryType
} from "../../config";
import { graphNeighborhood, neighborhoodIds } from "../../lib/graph/neighborhoods";
import type { EntryNode, GraphIndex, WritingBrowserState } from "../../lib/graph/types";
import { searchWriting, toSearchDocuments } from "../../lib/search/writingSearch";
import GraphCanvas from "./GraphCanvas";
import ListView from "./list/ListView";
import TopicsView from "./topics/TopicsView";

type GraphBrowserProps = {
  graph: GraphIndex;
};

const defaultState: WritingBrowserState = {
  view: "map"
};

// Focus mode + depth are config-only — see writingConfig.browser.focus.
const FOCUS_MODE = writingConfig.browser.focus.mode;
const FOCUS_DEPTH = writingConfig.browser.focus.depth;

const VIEWS = ["map", "topics", "list"] as const;
type View = (typeof VIEWS)[number];

export default function GraphBrowser({ graph }: GraphBrowserProps) {
  // Initialised to a constant, not to the URL. The server has no `window`, so
  // reading the URL during render makes the first client render disagree with
  // the markup the server sent on any non-default `?view=`. The URL is applied
  // in a mount effect instead — same shape as ThemeToggle.
  const [state, setState] = useState<WritingBrowserState>(defaultState);
  const [urlApplied, setUrlApplied] = useState(false);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((node) => node.tags))].sort(), [graph.nodes]);
  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const node of graph.nodes) out[node.type] = (out[node.type] ?? 0) + 1;
    return out;
  }, [graph.nodes]);
  const docs = useMemo(() => toSearchDocuments(graph.nodes), [graph.nodes]);
  // Per-view filter sets. Each view applies only the filters it surfaces in
  // its own UI. Inputs to these filters are still a single shared state
  // object, so toggling a chip in one view that also exists in another
  // (e.g. type chips appear in map + list) stays in sync. Filters that do
  // not have a UI in a given view are simply not applied to that view's
  // results.
  //
  //   View    Applies                              Does NOT apply
  //   ----    -------                              --------------
  //   map     query, types, tags, focus            —
  //   list    query, types                         tags, focus
  //   topics  query                                types, tags, focus
  //
  // `state.focus` flows through a separate path (focusIds / visibleGraph)
  // and only affects the map canvas, so it stays out of the searchResults
  // here.
  const mapSearchResults = useMemo(
    () => searchWriting(docs, { query: state.query, types: state.types, tags: state.tags }),
    [docs, state.query, state.types, state.tags]
  );
  const listSearchResults = useMemo(
    () => searchWriting(docs, { query: state.query, types: state.types }),
    [docs, state.query, state.types]
  );
  const topicsSearchResults = useMemo(
    () => searchWriting(docs, { query: state.query }),
    [docs, state.query]
  );
  const mapFilteredIds = useMemo(
    () => new Set(mapSearchResults.map((doc) => doc.id)),
    [mapSearchResults]
  );
  const focusIds = useMemo(() => {
    if (!state.focus) return undefined;
    return neighborhoodIds(graph, state.focus, FOCUS_DEPTH);
  }, [graph, state.focus]);
  const visibleGraph = useMemo(() => {
    const base =
      state.focus && FOCUS_MODE === "filter"
        ? graphNeighborhood(graph, state.focus, FOCUS_DEPTH)
        : graph;
    const nodes = base.nodes.filter((node) => mapFilteredIds.has(node.id));
    const allowed = new Set(nodes.map((node) => node.id));
    return {
      ...base,
      nodes,
      edges: base.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
    };
  }, [mapFilteredIds, graph, state.focus]);
  const selected = state.selected ? nodeById.get(state.selected) : graph.hubs[0] ?? graph.nodes[0];
  const focusNode = state.focus ? nodeById.get(state.focus) : undefined;
  const view = (state.view ?? defaultState.view) as View;

  useEffect(() => {
    setState(readStateFromUrl());
    setUrlApplied(true);
  }, []);

  useEffect(() => {
    // Gated: `writeStateToUrl` omits the parameter whenever the view equals the
    // default, so writing before the URL has been read would strip the very
    // `?view=` this is about to honour.
    if (!urlApplied) return;
    writeStateToUrl(state);
  }, [state, urlApplied]);

  function patch(patchState: Partial<WritingBrowserState>) {
    setState((current) => ({ ...current, ...patchState }));
  }

  function toggleType(type: EntryType) {
    const next = new Set(state.types ?? []);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    patch({ types: next.size ? [...next] : undefined });
  }

  function toggleTag(tag: string) {
    const next = new Set(state.tags ?? []);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    patch({ tags: next.size ? [...next] : undefined });
  }

  const listEntries = listSearchResults
    .map((doc) => nodeById.get(doc.id))
    .filter((node): node is EntryNode => Boolean(node));

  const topicsEntries = topicsSearchResults
    .map((doc) => nodeById.get(doc.id))
    .filter((node): node is EntryNode => Boolean(node));

  const entryCount =
    view === "map"
      ? visibleGraph.nodes.length
      : view === "topics"
      ? topicsEntries.length
      : listEntries.length;

  const ViewSwitcher = (
    <div className="graph-seg" role="tablist" aria-label="Writing view">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-pressed={view === v}
          onClick={() => patch({ view: v })}
        >
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <section className="graph-browser" aria-label="Writing browser">
      <div className="graph-view-bar">
        <div className="graph-view-bar__left">
          <span style={{ color: "var(--color-fg)", fontWeight: 500 }}>Writing</span>
          <span className="graph-view-bar__count">{entryCount} pages</span>
        </div>
        <div className="graph-view-bar__right">
          <input
            className="graph-input"
            style={{ width: 240 }}
            value={state.query ?? ""}
            onChange={(event) => patch({ query: event.target.value || undefined })}
            placeholder="Search title, tag, type…"
          />
          {ViewSwitcher}
        </div>
      </div>
      {view === "map" ? (
        <div className="graph-browser__grid">
          <aside className="graph-panel graph-panel--left">
            <div className="graph-control">
              <label>Topics</label>
              <ul className="topic-list">
                {graph.hubs.map((hub) => (
                  <li key={hub.id}>
                    <button
                      type="button"
                      aria-pressed={state.focus === hub.id}
                      onClick={() =>
                        patch({
                          focus: state.focus === hub.id ? undefined : hub.id,
                          selected: hub.id
                        })
                      }
                    >
                      {hub.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="graph-control">
              <label>Types</label>
              <div className="graph-button-row">
                {writingConfig.entryTypes.map((type) => {
                  const entryType = getEntryType(type);
                  const cfg = entryType.graph;
                  const count = typeCounts[type] ?? 0;
                  return (
                    <button
                      key={type}
                      type="button"
                      className="graph-button graph-button--type"
                      style={{ ["--swatch" as any]: cfg?.color }}
                      aria-pressed={(state.types ?? []).includes(type)}
                      onClick={() => toggleType(type)}
                    >
                      {entryType.label}
                      {count > 0 && <span style={{ color: "var(--color-muted-2)" }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="graph-control">
              <label>Tags</label>
              <div className="graph-button-row">
                {tags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="graph-button"
                    aria-pressed={(state.tags ?? []).includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

          </aside>

          <div className="graph-panel graph-panel--center">
            <div className="graph-canvas-bar">
              <div className="graph-crumbs">
                <span className="crumb">All writing</span>
                {focusNode && (
                  <>
                    <span className="crumb-sep">›</span>
                    <span className="crumb crumb--active">{focusNode.title}</span>
                    <button
                      type="button"
                      aria-label="Clear focus"
                      onClick={() => patch({ focus: undefined })}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="graph-canvas">
              <GraphCanvas
                graph={visibleGraph}
                height={620}
                selected={state.selected}
                selectedStyle="soft-glow"
                highlighted={focusIds}
                dimUnhighlighted={FOCUS_MODE === "dim"}
                draggable
                hubLayout={graphConfig.layout.hubs}
                labelMode={graphConfig.layout.labels}
                labelSide={graphConfig.layout.labelSide}
                onSelect={(id) => patch({ selected: id })}
              />
              <div className="graph-legend" aria-hidden="true">
                {entryTypeDefinitions.map((entryType) => {
                  const cfg = entryType.graph;
                  return (
                    <span key={entryType.id}>
                      <NodeIcon
                        shape={cfg.shape as NodeShape}
                        color={cfg.color as string}
                      />
                      {entryType.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="graph-panel graph-panel--right preview-pane">
            {selected ? <Preview node={selected} graph={graph} /> : <p className="muted">Select a node.</p>}
          </aside>
        </div>
      ) : view === "topics" ? (
        <TopicsView graph={graph} entries={topicsEntries} />
      ) : (
        <ListView
          entries={listEntries}
          activeTypes={state.types ?? []}
          onToggleType={toggleType}
          typeCounts={typeCounts}
        />
      )}
    </section>
  );
}

function Preview({ node, graph }: { node: EntryNode; graph: GraphIndex }) {
  const backlinks = graph.backlinks[node.id] ?? [];
  const outgoing = graph.outgoing[node.id] ?? [];
  const byId = new Map(graph.nodes.map((item) => [item.id, item]));
  const entryType = getEntryType(node.type);
  return (
    <>
      <div className="preview-header">
        <span className="pill" style={{ ["--pill-color" as any]: entryType.graph.color }}>
          {entryType.label}
        </span>
        {node.date && <span className="preview-date">{node.date}</span>}
      </div>
      <h2>{node.title}</h2>
      {node.summary && <p className="preview-summary">{node.summary}</p>}
      {node.tags.length > 0 && (
        <div className="tag-list">
          {node.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
      <a className="open-btn" href={node.url}>
        Open page →
      </a>
      {outgoing.length > 0 && (
        <div className="sidebar-section">
          <h2>Outgoing</h2>
          <ul>
            {outgoing.map((id) => {
              const item = byId.get(id);
              return (
                <li key={id}>
                  {item ? (
                    <a href={item.url} style={{ color: "inherit", textDecoration: "none" }}>
                      {item.title}
                    </a>
                  ) : (
                    id
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {backlinks.length > 0 && (
        <div className="sidebar-section">
          <h2>Backlinks</h2>
          <ul>
            {backlinks.map((id) => {
              const item = byId.get(id);
              return (
                <li key={id}>
                  {item ? (
                    <a href={item.url} style={{ color: "inherit", textDecoration: "none" }}>
                      {item.title}
                    </a>
                  ) : (
                    id
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

// Only the active view round-trips through the URL. All other state —
// selection, query, types, tags, focus — is session-only by design so the
// URL stays clean and shareable without dragging along ephemeral UI state.
function readStateFromUrl(): WritingBrowserState {
  if (typeof window === "undefined") return defaultState;
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") as View | null;
  return {
    view: view && VIEWS.includes(view) ? view : defaultState.view
  };
}

function writeStateToUrl(state: WritingBrowserState) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (state.view !== defaultState.view) params.set("view", state.view);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

type NodeShape = "square" | "circle" | "diamond" | "hexagon";

function NodeIcon({ shape, color }: { shape: NodeShape; color: string }) {
  // Inline SVG so the legend mirrors the actual node glyphs drawn on the
  // canvas (not just colored dots).
  const props = {
    width: 12,
    height: 12,
    viewBox: "-6 -6 12 12",
    "aria-hidden": true,
    className: "graph-legend-icon",
    style: { color, fill: color }
  } as const;
  switch (shape) {
    case "square":
      return (
        <svg {...props}>
          <rect x={-4} y={-4} width={8} height={8} />
        </svg>
      );
    case "diamond":
      return (
        <svg {...props}>
          <polygon points="0,-5 5,0 0,5 -5,0" />
        </svg>
      );
    case "hexagon": {
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return `${Math.cos(angle) * 5},${Math.sin(angle) * 5}`;
      }).join(" ");
      return (
        <svg {...props}>
          <polygon points={points} />
        </svg>
      );
    }
    case "circle":
    default:
      return (
        <svg {...props}>
          <circle cx={0} cy={0} r={4.5} />
        </svg>
      );
  }
}
