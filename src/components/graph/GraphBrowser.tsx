import { useEffect, useMemo, useRef, useState } from "react";

import {
  getEntryType,
  graphConfig,
  isHubType,
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
  // The map *applies* all four, but not by removing anything: on a map an
  // attribute selection marks nodes, it does not delete them. Removal there
  // severed the structure that gives the remaining nodes their meaning —
  // node types are not connected subgraphs, so filtering to "paper" left
  // three isolated dots — and it re-settled the layout on every click. The
  // map's results therefore feed `emphasizedIds`, not the node set.
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
  const mapMatchIds = useMemo(
    () => new Set(mapSearchResults.map((doc) => doc.id)),
    [mapSearchResults]
  );
  const focusIds = useMemo(() => {
    if (!state.focus) return undefined;
    return neighborhoodIds(graph, state.focus, FOCUS_DEPTH);
  }, [graph, state.focus]);
  const hasSelection = Boolean(
    state.query || state.types?.length || state.tags?.length || state.focus
  );
  // One predicate, four inputs. A node paints full-strength iff it satisfies
  // the query, the type chips, the tag chips *and* the focused region —
  // rather than focus dimming while the other three deleted, which is how
  // these used to compose (by accident).
  const emphasizedIds = useMemo(() => {
    if (!focusIds) return mapMatchIds;
    return new Set([...mapMatchIds].filter((id) => focusIds.has(id)));
  }, [mapMatchIds, focusIds]);
  // Only a *filtering* focus removes nodes from the map, and that is opt-in
  // config. Note what is absent: the attribute filters, which no longer touch
  // the node set at all. That also settles the re-layout — handing
  // `GraphCanvas` a new graph object rebuilds every node from scratch,
  // dropping both the settled positions and the ones the reader dragged, so
  // the fewer things that can change this identity the better.
  const filteringFocus = FOCUS_MODE === "filter" ? state.focus : undefined;
  const visibleGraph = useMemo(
    () => (filteringFocus ? graphNeighborhood(graph, filteringFocus, FOCUS_DEPTH) : graph),
    [graph, filteringFocus]
  );
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

  // The map no longer removes anything, so a bare node count would read "14
  // pages" forever. Matches-of-total is what carries the responsiveness a
  // filter owes the reader once it has stopped changing the picture's size.
  const mapMatchCount = emphasizedIds.size;
  const countLabel =
    view === "map"
      ? hasSelection
        ? `${mapMatchCount} of ${visibleGraph.nodes.length} pages`
        : `${visibleGraph.nodes.length} pages`
      : view === "topics"
      ? `${topicsEntries.length} pages`
      : `${listEntries.length} pages`;

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
          <span className="graph-view-bar__count">{countLabel}</span>
        </div>
        <div className="graph-view-bar__right">
          <input
            className="graph-input"
            value={state.query ?? ""}
            onChange={(event) => patch({ query: event.target.value || undefined })}
            placeholder="Search title, tag, type…"
          />
          {ViewSwitcher}
        </div>
      </div>
      {view === "map" ? (
        <div className="graph-browser__grid">
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
                {/* A map where everything is faded looks identical to one that
                    failed to render, so the zero case has to be said in words
                    rather than shown. */}
                {hasSelection && mapMatchCount === 0 && (
                  <span className="crumb crumb--empty">No pages match</span>
                )}
                {hasSelection && (
                  <button
                    type="button"
                    className="graph-crumbs__reset"
                    onClick={() =>
                      patch({ query: undefined, types: undefined, tags: undefined, focus: undefined })
                    }
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="graph-filters">
                {/* Doubles as the canvas legend. Each chip carries the glyph
                    its type is actually drawn with, so the vocabulary and the
                    filter are one control rather than two that drift apart —
                    and it sits in the chrome instead of overlaying the map. */}
                <div className="graph-typefilter" role="group" aria-label="Filter by type">
                  {writingConfig.entryTypes
                    .filter((type) => (typeCounts[type] ?? 0) > 0)
                    .map((type) => {
                      const entryType = getEntryType(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          className="graph-button"
                          aria-pressed={(state.types ?? []).includes(type)}
                          onClick={() => toggleType(type)}
                        >
                          <NodeIcon
                            shape={entryType.graph.shape as NodeShape}
                            color={entryType.graph.color as string}
                          />
                          {entryType.label}
                          <span className="graph-button__count">{typeCounts[type]}</span>
                        </button>
                      );
                    })}
                </div>
                <TagFilter
                  tags={tags}
                  active={state.tags ?? []}
                  onToggle={toggleTag}
                  onClear={() => patch({ tags: undefined })}
                />
              </div>
            </div>
            <div className="graph-canvas">
              <GraphCanvas
                graph={visibleGraph}
                height={660}
                selected={state.selected}
                selectedStyle="soft-glow"
                emphasized={hasSelection ? emphasizedIds : undefined}
                focusRegion={FOCUS_MODE === "dim" ? focusIds : undefined}
                drag={graphConfig.interaction.drag}
                hubLayout={graphConfig.layout.hubs}
                labelMode={graphConfig.layout.labels}
                labelSide={graphConfig.layout.labelSide}
                onSelect={(id) => {
                  // A hub is a place, not merely an entry: clicking one both
                  // selects it and toggles the topic focus. The map's own
                  // glyphs are the largest, always-labelled things on screen,
                  // so they carry the navigation a separate topic list used to
                  // duplicate in text beside them.
                  const node = nodeById.get(id);
                  if (node && isHubType(node.type)) {
                    patch({ selected: id, focus: state.focus === id ? undefined : id });
                  } else {
                    patch({ selected: id });
                  }
                }}
              />
            </div>
          </div>

          <aside className="graph-panel graph-panel--right preview-pane">
            {selected ? (
              <Preview
                node={selected}
                graph={graph}
                nodeById={nodeById}
                onSelect={(id) => patch({ selected: id })}
              />
            ) : (
              <p className="muted">Select a node.</p>
            )}
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

/**
 * Tags behind a disclosure rather than spread across a permanent column.
 * They are the weakest of the three filters — the search field already matches
 * on tags — so they earn a button of chrome, not a third of the viewport.
 */
function TagFilter({
  tags,
  active,
  onToggle,
  onClear
}: {
  tags: string[];
  active: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // `pointerdown`, not `click`: a press that starts outside should dismiss
    // before the canvas underneath treats the release as a node selection.
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (tags.length === 0) return null;

  return (
    <div className="graph-tagfilter" ref={ref}>
      <button
        type="button"
        className="graph-button"
        aria-expanded={open}
        aria-pressed={active.length > 0}
        onClick={() => setOpen((current) => !current)}
      >
        tags
        {active.length > 0 && <span className="graph-button__count">{active.length}</span>}
        <span className="graph-button__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="graph-tagpop">
          <div className="graph-tagpop__list">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="graph-button"
                aria-pressed={active.includes(tag)}
                onClick={() => onToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {active.length > 0 && (
            <button type="button" className="graph-tagpop__clear" onClick={onClear}>
              Clear tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type Direction = "both" | "out" | "in";

const DIRECTION_TEXT: Record<Direction, string> = {
  both: "links both ways",
  out: "links to",
  in: "linked from"
};
// Reciprocal first: two pages that link to each other have the strongest
// relationship on offer, and splitting the list by direction was precisely
// what hid it — you had to notice the same title twice to see it at all.
const DIRECTION_RANK: Record<Direction, number> = { both: 0, out: 1, in: 2 };

/**
 * Panel describing whatever node is selected on the map.
 *
 * Its rows *select*, they do not navigate — the same division of labour
 * LocalGraphMap already documents. A reader following a chain of connections
 * is inspecting the graph, not leaving it, and a row that silently changes
 * the page costs them the map they were reading. Navigation stays the one
 * explicit action: "Open page".
 */
function Preview({
  node,
  graph,
  nodeById,
  onSelect
}: {
  node: EntryNode;
  graph: GraphIndex;
  nodeById: Map<string, EntryNode>;
  onSelect: (id: string) => void;
}) {
  const entryType = getEntryType(node.type);
  const connections = useMemo(() => {
    const linksTo = new Set(graph.linksTo[node.id] ?? []);
    const linkedFrom = new Set(graph.linkedFrom[node.id] ?? []);
    // One row per connected page, not one per direction. A reciprocal link
    // used to print twice — for the most connected entry in this corpus that
    // meant ten rows carrying five relationships.
    return [...new Set([...linksTo, ...linkedFrom])]
      .map((id) => {
        const item = nodeById.get(id);
        if (!item) return undefined;
        const direction: Direction =
          linksTo.has(id) && linkedFrom.has(id) ? "both" : linksTo.has(id) ? "out" : "in";
        return { item, direction };
      })
      .filter((entry): entry is { item: EntryNode; direction: Direction } => Boolean(entry))
      .sort(
        (a, b) =>
          DIRECTION_RANK[a.direction] - DIRECTION_RANK[b.direction] ||
          a.item.title.localeCompare(b.item.title)
      );
  }, [graph, node.id, nodeById]);

  return (
    <>
      <div className="preview-header">
        <span className="pill" style={{ ["--pill-color" as any]: entryType.graph.color }}>
          {entryType.label}
        </span>
        {node.date && <span className="preview-date">{node.date}</span>}
      </div>
      {/*
        Not a heading: this is a panel label that changes on every click, not
        page structure, and promoting it would put the same title in the
        document outline twice. Same reasoning as LocalGraphMap's title.
      */}
      <p className="preview-title">{node.title}</p>
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
      {connections.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-section__label">
            Connections <span className="sidebar-section__count">{connections.length}</span>
          </p>
          <ul className="connection-list">
            {connections.map(({ item, direction }) => {
              const itemType = getEntryType(item.type);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="preview-link"
                    onClick={() => onSelect(item.id)}
                    title={DIRECTION_TEXT[direction]}
                    aria-label={`${item.title} — ${DIRECTION_TEXT[direction]}`}
                  >
                    <DirectionIcon direction={direction} />
                    <NodeIcon
                      shape={itemType.graph.shape as NodeShape}
                      color={itemType.graph.color as string}
                    />
                    <span className="connection-title">{item.title}</span>
                  </button>
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

/**
 * Direction marker for a connection row.
 *
 * Drawn rather than typeset. The mono face renders its arrow glyphs as
 * hairlines that barely respond to the weight axis, and a text glyph sits on a
 * baseline while the node icon beside it is a box — so the two never lined up.
 * A stroked path fixes the weight and the alignment at once.
 */
function DirectionIcon({ direction }: { direction: Direction }) {
  const props = {
    width: 16,
    height: 12,
    viewBox: "0 0 16 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className: "connection-dir"
  } as const;
  switch (direction) {
    case "both":
      return (
        <svg {...props}>
          <path d="M3.4 6h9.2" />
          <path d="M6.3 3.1 3.3 6l3 2.9" />
          <path d="M9.7 3.1 12.7 6l-3 2.9" />
        </svg>
      );
    case "out":
      return (
        <svg {...props}>
          <path d="M2.6 6h9.9" />
          <path d="M9.2 2.7 12.6 6l-3.4 3.3" />
        </svg>
      );
    case "in":
    default:
      return (
        <svg {...props}>
          <path d="M13.4 6H3.5" />
          <path d="M6.8 2.7 3.4 6l3.4 3.3" />
        </svg>
      );
  }
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
