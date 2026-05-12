import { useEffect, useMemo, useState } from "react";

import { writingConfig, type EntryType } from "../../config/writing";
import { graphNeighborhood, neighborhoodIds } from "../../lib/graph/neighborhoods";
import type { EntryNode, GraphIndex, WritingBrowserState } from "../../lib/graph/types";
import { searchWriting, toSearchDocuments } from "../../lib/search/writingSearch";
import GraphCanvas from "./GraphCanvas";

type GraphBrowserProps = {
  graph: GraphIndex;
};

const defaultState: WritingBrowserState = {
  view: "map",
  depth: 1,
  focusMode: "dim"
};

export default function GraphBrowser({ graph }: GraphBrowserProps) {
  const [state, setState] = useState<WritingBrowserState>(() => readStateFromUrl());
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((node) => node.tags))].sort(), [graph.nodes]);
  const docs = useMemo(() => toSearchDocuments(graph.nodes), [graph.nodes]);
  const searchResults = useMemo(
    () => searchWriting(docs, { query: state.query, types: state.types, tags: state.tags }),
    [docs, state.query, state.tags, state.types]
  );
  const filteredIds = useMemo(() => new Set(searchResults.map((doc) => doc.id)), [searchResults]);
  const focusIds = useMemo(() => {
    if (!state.focus) return undefined;
    return neighborhoodIds(graph, state.focus, state.depth);
  }, [graph, state.depth, state.focus]);
  const visibleGraph = useMemo(() => {
    const base =
      state.focus && state.focusMode === "filter" ? graphNeighborhood(graph, state.focus, state.depth) : graph;
    const nodes = base.nodes.filter((node) => filteredIds.has(node.id));
    const allowed = new Set(nodes.map((node) => node.id));
    return {
      ...base,
      nodes,
      edges: base.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
    };
  }, [filteredIds, graph, state.depth, state.focus, state.focusMode]);
  const selected = state.selected ? nodeById.get(state.selected) : graph.hubs[0] ?? graph.nodes[0];

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

  return (
    <section className="graph-browser" aria-label="Writing graph browser">
      <div className="graph-browser__grid">
        <aside className="graph-panel graph-panel--left">
          <div className="graph-control">
            <label htmlFor="writing-search">Search</label>
            <input
              id="writing-search"
              className="graph-input"
              value={state.query ?? ""}
              onChange={(event) => patch({ query: event.target.value || undefined })}
              placeholder="Title, tag, type..."
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
                    onClick={() => patch({ focus: state.focus === hub.id ? undefined : hub.id, selected: hub.id })}
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
              {writingConfig.entryTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="graph-button"
                  aria-pressed={(state.types ?? []).includes(type)}
                  onClick={() => toggleType(type)}
                >
                  {type}
                </button>
              ))}
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

          <div className="graph-control">
            <label>Focus</label>
            <div className="graph-button-row">
              <button
                type="button"
                className="graph-button"
                aria-pressed={state.focusMode === "dim"}
                onClick={() => patch({ focusMode: "dim" })}
              >
                Dim
              </button>
              <button
                type="button"
                className="graph-button"
                aria-pressed={state.focusMode === "filter"}
                onClick={() => patch({ focusMode: "filter" })}
              >
                Filter
              </button>
              <button
                type="button"
                className="graph-button"
                aria-pressed={state.depth === 2}
                onClick={() => patch({ depth: state.depth === 1 ? 2 : 1 })}
              >
                Depth {state.depth}
              </button>
            </div>
          </div>
        </aside>

        <div className="graph-panel">
          <GraphCanvas
            graph={visibleGraph}
            height={660}
            selected={state.selected}
            highlighted={focusIds}
            dimUnhighlighted={state.focusMode === "dim"}
            onSelect={(id) => patch({ selected: id })}
          />
        </div>

        <aside className="graph-panel graph-panel--right preview-pane">
          {selected ? <Preview node={selected} graph={graph} /> : <p className="muted">Select a node.</p>}
        </aside>
      </div>
    </section>
  );
}

function Preview({ node, graph }: { node: EntryNode; graph: GraphIndex }) {
  const backlinks = graph.backlinks[node.id] ?? [];
  const outgoing = graph.outgoing[node.id] ?? [];
  const byId = new Map(graph.nodes.map((item) => [item.id, item]));
  return (
    <>
      <p className="entry-meta">{node.type}</p>
      <h2>{node.title}</h2>
      {node.summary && <p>{node.summary}</p>}
      <div className="tag-list">{node.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <p>
        <a className="button button--primary" href={node.url}>
          Open Entry
        </a>
      </p>
      <div className="sidebar-section">
        <h2>Outgoing</h2>
        <ul>{outgoing.map((id) => <li key={id}>{byId.get(id)?.title ?? id}</li>)}</ul>
      </div>
      <div className="sidebar-section">
        <h2>Backlinks</h2>
        <ul>{backlinks.map((id) => <li key={id}>{byId.get(id)?.title ?? id}</li>)}</ul>
      </div>
    </>
  );
}

function readStateFromUrl(): WritingBrowserState {
  if (typeof window === "undefined") return defaultState;
  const params = new URLSearchParams(window.location.search);
  return {
    view: (params.get("view") as WritingBrowserState["view"]) || defaultState.view,
    focus: params.get("focus") || undefined,
    selected: params.get("selected") || undefined,
    query: params.get("q") || undefined,
    types: splitParam(params.get("type")) as EntryType[] | undefined,
    tags: splitParam(params.get("tag")),
    depth: params.get("depth") === "2" ? 2 : 1,
    focusMode: params.get("mode") === "filter" ? "filter" : "dim"
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
  if (state.depth !== defaultState.depth) params.set("depth", String(state.depth));
  if (state.focusMode !== defaultState.focusMode) params.set("mode", state.focusMode);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function splitParam(value: string | null): string[] | undefined {
  const parts = value?.split(",").map((part) => part.trim()).filter(Boolean);
  return parts?.length ? parts : undefined;
}
