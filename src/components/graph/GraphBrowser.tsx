import { useEffect, useMemo, useState } from "react";

import { graphConfig } from "../../config/graph";
import { writingConfig, type EntryType } from "../../config/writing";
import { graphNeighborhood, neighborhoodIds } from "../../lib/graph/neighborhoods";
import type { EntryNode, GraphIndex, WritingBrowserState } from "../../lib/graph/types";
import { searchWriting, toSearchDocuments } from "../../lib/search/writingSearch";
import GraphCanvas from "./GraphCanvas";

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

const TYPE_ORDER: EntryType[] = ["hub", "sub-hub", "paper", "post", "note", "project", "teaching"];

export default function GraphBrowser({ graph }: GraphBrowserProps) {
  const [state, setState] = useState<WritingBrowserState>(() => readStateFromUrl());
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((node) => node.tags))].sort(), [graph.nodes]);
  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const node of graph.nodes) out[node.type] = (out[node.type] ?? 0) + 1;
    return out;
  }, [graph.nodes]);
  const docs = useMemo(() => toSearchDocuments(graph.nodes), [graph.nodes]);
  const searchResults = useMemo(
    () => searchWriting(docs, { query: state.query, types: state.types, tags: state.tags }),
    [docs, state.query, state.tags, state.types]
  );
  const filteredIds = useMemo(() => new Set(searchResults.map((doc) => doc.id)), [searchResults]);
  const focusIds = useMemo(() => {
    if (!state.focus) return undefined;
    return neighborhoodIds(graph, state.focus, FOCUS_DEPTH);
  }, [graph, state.focus]);
  const visibleGraph = useMemo(() => {
    const base =
      state.focus && FOCUS_MODE === "filter"
        ? graphNeighborhood(graph, state.focus, FOCUS_DEPTH)
        : graph;
    const nodes = base.nodes.filter((node) => filteredIds.has(node.id));
    const allowed = new Set(nodes.map((node) => node.id));
    return {
      ...base,
      nodes,
      edges: base.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
    };
  }, [filteredIds, graph, state.focus]);
  const selected = state.selected ? nodeById.get(state.selected) : graph.hubs[0] ?? graph.nodes[0];
  const focusNode = state.focus ? nodeById.get(state.focus) : undefined;
  const view = (state.view ?? "map") as View;

  useEffect(() => {
    writeStateToUrl(state);
  }, [state]);

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

  const filteredEntries = searchResults
    .map((doc) => nodeById.get(doc.id))
    .filter((node): node is EntryNode => Boolean(node));

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
      {view === "map" ? (
        <div className="graph-browser__grid">
          <aside className="graph-panel graph-panel--left">
            <div className="graph-control">
              <label htmlFor="writing-search">Search</label>
              <input
                id="writing-search"
                className="graph-input"
                value={state.query ?? ""}
                onChange={(event) => patch({ query: event.target.value || undefined })}
                placeholder="Title, tag, type…"
              />
            </div>

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
                  const cfg = graphConfig.nodeTypes[type as keyof typeof graphConfig.nodeTypes];
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
                      {type}
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
                <span className="graph-view-bar__count" style={{ marginLeft: 12 }}>
                  {visibleGraph.nodes.length} entries
                </span>
              </div>
              {ViewSwitcher}
            </div>
            <div className="graph-canvas">
              <GraphCanvas
                graph={visibleGraph}
                height={620}
                selected={state.selected}
                highlighted={focusIds}
                dimUnhighlighted={FOCUS_MODE === "dim"}
                hubLayout={graphConfig.layout.hubs}
                labelMode={graphConfig.layout.labels}
                labelSide={graphConfig.layout.labelSide}
                onSelect={(id) => patch({ selected: id })}
              />
              <div className="graph-legend" aria-hidden="true">
                {(["hub", "sub-hub", "paper", "note", "teaching", "project"] as const).map((type) => {
                  const cfg = graphConfig.nodeTypes[type];
                  return (
                    <span key={type}>
                      <NodeIcon
                        shape={cfg.shape as NodeShape}
                        color={cfg.color as string}
                      />
                      {type}
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
      ) : (
        <>
          <div className="graph-view-bar">
            <div className="graph-view-bar__left">
              <span style={{ color: "var(--color-fg)", fontWeight: 500 }}>Writing</span>
              <span className="graph-view-bar__count">{filteredEntries.length} entries</span>
            </div>
            <div className="graph-view-bar__right">
              <input
                className="graph-input"
                style={{ width: 240 }}
                value={state.query ?? ""}
                onChange={(event) => patch({ query: event.target.value || undefined })}
                placeholder="Search…"
              />
              {ViewSwitcher}
            </div>
          </div>
          {view === "topics" ? (
            <TopicsView graph={graph} entries={filteredEntries} />
          ) : (
            <ListView entries={filteredEntries} />
          )}
        </>
      )}
    </section>
  );
}

function TopicsView({ graph, entries }: { graph: GraphIndex; entries: EntryNode[] }) {
  const entryIds = new Set(entries.map((entry) => entry.id));
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return (
    <div className="topicspage">
      <div className="topicspage-body">
        {graph.hubs.map((hub) => {
          const linkedIds = [
            ...new Set([...(graph.backlinks[hub.id] ?? []), ...(graph.outgoing[hub.id] ?? [])])
          ].filter((id) => id !== hub.id && entryIds.has(id));
          const linked = linkedIds
            .map((id) => nodeById.get(id))
            .filter((node): node is EntryNode => Boolean(node) && node!.type !== "hub")
            .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
          const byType: Record<string, EntryNode[]> = {};
          for (const item of linked) {
            (byType[item.type] = byType[item.type] ?? []).push(item);
          }
          return (
            <section className="hubsec" key={hub.id}>
              <div className="hubsec-head">
                <div className="hubsec-icon" aria-hidden="true">
                  <span style={{ background: graphConfig.nodeTypes.hub.color as string }} />
                </div>
                <div>
                  <a className="hubsec-title" href={hub.url}>
                    {hub.title}
                  </a>
                  {hub.summary && <div className="hubsec-summary">{hub.summary}</div>}
                </div>
                <div className="hubsec-meta">
                  <span className="hubsec-count">{linked.length} linked</span>
                  <a className="cta cta--small" href={hub.url}>
                    Open hub →
                  </a>
                </div>
              </div>
              {TYPE_ORDER.filter((tp) => byType[tp]).map((tp) => (
                <div className="hubsec-grouprow" key={tp}>
                  <div className="hubsec-grouplabel">
                    <span
                      className="swatch"
                      style={{
                        background: graphConfig.nodeTypes[tp].color as string
                      }}
                    />
                    {tp}
                    <span className="hubsec-groupcount">{byType[tp].length}</span>
                  </div>
                  <ul className="hubsec-list">
                    {byType[tp].map((entry) => (
                      <li key={entry.id} className="hubsec-item">
                        <a className="hubsec-itemtitle" href={entry.url}>
                          {entry.title}
                        </a>
                        <div className="hubsec-itemmeta">
                          {entry.date && <span>{entry.date}</span>}
                        </div>
                        {entry.summary && <div className="hubsec-itemsum">{entry.summary}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ entries }: { entries: EntryNode[] }) {
  const sorted = [...entries].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <div className="listpage">
      <div className="listpage-table">
        <div className="listrow listrow--head">
          <span className="lc lc-type">Type</span>
          <span className="lc lc-title">Title</span>
          <span className="lc lc-tags">Tags</span>
          <span className="lc lc-date">Date ↓</span>
        </div>
        {sorted.map((entry) => (
          <a key={entry.id} className="listrow" href={entry.url}>
            <span className="lc lc-type">
              <span
                className="swatch"
                style={{
                  background: (graphConfig.nodeTypes[entry.type as keyof typeof graphConfig.nodeTypes]
                    ?.color ?? "var(--color-muted)") as string
                }}
              />
              <span className="lc-typelabel">{entry.type}</span>
            </span>
            <span className="lc lc-title">
              <span className="lc-titletext">{entry.title}</span>
              {entry.summary && <span className="lc-summary">{entry.summary}</span>}
            </span>
            <span className="lc lc-tags">
              {entry.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </span>
            <span className="lc lc-date">{entry.date ?? ""}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Preview({ node, graph }: { node: EntryNode; graph: GraphIndex }) {
  const backlinks = graph.backlinks[node.id] ?? [];
  const outgoing = graph.outgoing[node.id] ?? [];
  const byId = new Map(graph.nodes.map((item) => [item.id, item]));
  return (
    <>
      <div className="preview-header">
        <span className={`pill pill--${node.type}`}>{node.type}</span>
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
        Open entry →
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

function readStateFromUrl(): WritingBrowserState {
  if (typeof window === "undefined") return defaultState;
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") as View | null;
  return {
    view: view && VIEWS.includes(view) ? view : defaultState.view,
    focus: params.get("focus") || undefined,
    selected: params.get("selected") || undefined,
    query: params.get("q") || undefined,
    types: splitParam(params.get("type")) as EntryType[] | undefined,
    tags: splitParam(params.get("tag"))
  };
}

function writeStateToUrl(state: WritingBrowserState) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (state.view !== defaultState.view) params.set("view", state.view);
  if (state.focus) params.set("focus", state.focus);
  if (state.selected) params.set("selected", state.selected);
  if (state.query) params.set("q", state.query);
  if (state.types?.length) params.set("type", state.types.join(","));
  if (state.tags?.length) params.set("tag", state.tags.join(","));
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function splitParam(value: string | null): string[] | undefined {
  const parts = value?.split(",").map((part) => part.trim()).filter(Boolean);
  return parts?.length ? parts : undefined;
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
