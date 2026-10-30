import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getEntryType, graphConfig, writingConfig, type EntryType } from "../../config";
import type { EntryNode, GraphIndex, WritingBrowserState } from "../../lib/graph/types";
import { hubMemberCounts } from "../../lib/graph/clusterLayout";
import { searchWriting, toSearchDocuments } from "../../lib/search/writingSearch";
import GraphCanvas from "./GraphCanvas";
import HubList from "./HubList";
import NodeDetailPanel from "./NodeDetailPanel";
import NodeIcon, { type NodeShape } from "./NodeIcon";
import ListView from "./list/ListView";
import TopicsView from "./topics/TopicsView";

type GraphBrowserProps = {
  graph: GraphIndex;
};

const defaultState: WritingBrowserState = {
  view: "map"
};

// Where graph.css stops laying the browser out in columns and turns the panel
// into a bottom sheet over the map.
const STACK_BREAKPOINT = 980;
// The canvas is sized to the window so the whole map — chrome, canvas, panel —
// fits on one screen. These bound it: below the minimum a map is not worth
// having, and above the maximum a big monitor gets more empty canvas, not more
// map. The gap is what stays visible below the frame.
const CANVAS_MIN = 420;
const CANVAS_MAX = 760;
const CANVAS_MIN_NARROW = 300;
const BOTTOM_GAP = 28;
const BOTTOM_GAP_NARROW = 12;
// Server render and first paint, before the window has been measured.
const CANVAS_HEIGHT_DEFAULT = 600;

const VIEWS = ["map", "topics", "list"] as const;
type View = (typeof VIEWS)[number];

export default function GraphBrowser({ graph }: GraphBrowserProps) {
  // Initialised to a constant, not to the URL. The server has no `window`, so
  // reading the URL during render makes the first client render disagree with
  // the markup the server sent on any non-default `?view=`. The URL is applied
  // in a mount effect instead — same shape as ThemeToggle.
  const [state, setState] = useState<WritingBrowserState>(defaultState);
  const [urlApplied, setUrlApplied] = useState(false);
  // The canvas needs a pixel height, so this one piece of layout cannot live in
  // the stylesheet with the rest. Matches the grid's own breakpoint.
  const [narrow, setNarrow] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT_DEFAULT);
  // On a phone the panel is a sheet over the bottom of the map. The map fits
  // itself to what the *collapsed* sheet leaves visible; expanding the sheet to
  // read more covers part of the map rather than shrinking it to a stamp.
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetInset, setSheetInset] = useState(0);
  const canvasSlotRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((node) => node.tags))].sort(), [graph.nodes]);
  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const node of graph.nodes) out[node.type] = (out[node.type] ?? 0) + 1;
    return out;
  }, [graph.nodes]);
  const docs = useMemo(() => toSearchDocuments(graph.nodes), [graph.nodes]);
  const hubCounts = useMemo(() => hubMemberCounts(graph.nodes), [graph.nodes]);
  // Per-view filter sets. Each view applies only the filters it surfaces in
  // its own UI. Inputs to these filters are still a single shared state
  // object, so toggling a chip in one view that also exists in another
  // (e.g. type chips appear in map + list) stays in sync. Filters that do
  // not have a UI in a given view are simply not applied to that view's
  // results.
  //
  //   View    Applies                              Does NOT apply
  //   ----    -------                              --------------
  //   map     query, types, tags                   —
  //   list    query, types                         tags
  //   topics  query                                types, tags
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
  // Nothing removes nodes from the map: an attribute selection marks them and
  // leaves the graph object identical, which is what keeps the layout from
  // re-settling. Handing `GraphCanvas` a new graph rebuilds every node from
  // scratch and drops both the settled positions and any the reader dragged.
  const hasSelection = Boolean(state.query || state.types?.length || state.tags?.length);
  // No fallback: nothing is selected until the reader picks something. This
  // used to default to the first hub, which put that hub in the panel while
  // the canvas — handed `state.selected`, still empty — marked nothing. The
  // canvas now takes its selection from this same value, so the two cannot
  // disagree about what is being inspected.
  const selected = state.selected ? nodeById.get(state.selected) : undefined;
  const view = (state.view ?? defaultState.view) as View;

  useEffect(() => {
    setState(readStateFromUrl());
    setUrlApplied(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${STACK_BREAKPOINT}px)`);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Fit the canvas to the window: whatever height is left below the canvas's
  // top edge, less a small gap. Measured from the page top, not the viewport,
  // so a resize while scrolled gives the same answer as one at the top.
  useLayoutEffect(() => {
    if (view !== "map") return;
    const measure = () => {
      const slot = canvasSlotRef.current;
      if (!slot) return;
      const top = slot.getBoundingClientRect().top + window.scrollY;
      const available = window.innerHeight - top - (narrow ? BOTTOM_GAP_NARROW : BOTTOM_GAP);
      const next = narrow
        ? Math.max(CANVAS_MIN_NARROW, available)
        : Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, available));
      setCanvasHeight(Math.round(next));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, narrow]);

  // Track the collapsed sheet's height, which is what the map fits above.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!narrow || !panel || sheetExpanded) {
      if (!narrow) setSheetInset(0);
      return;
    }
    const update = () => setSheetInset(Math.round(panel.offsetHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [narrow, sheetExpanded, view, state.selected]);

  // A new selection opens collapsed: the sheet's first job is to say what was
  // tapped, and the map should stay in view while it does.
  useEffect(() => {
    setSheetExpanded(false);
  }, [state.selected]);

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

  // The heading's count is the whole collection on the map, where a filter
  // marks rather than removes; the bar beside the chips reports the matches.
  // The list and topics views do remove, so there it is the count shown.
  const mapMatchCount = mapMatchIds.size;
  const pageCount =
    view === "map"
      ? graph.nodes.length
      : view === "topics"
        ? topicsEntries.length
        : listEntries.length;
  const countLabel = `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;

  const ViewSwitcher = (
    <div className="graph-seg" role="tablist" aria-label={`${writingConfig.label} view`}>
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
    <section className="graph-browser" aria-label={`${writingConfig.label} browser`}>
      {/* The page's own header, set like every other top-level page's: the
          serif title and a line beneath it, with the controls that act on the
          whole collection beside the title. */}
      <header className="graph-browser__head">
        <h1 className="graph-browser__title">{writingConfig.label}</h1>
        <div className="graph-browser__controls">
          <label className="graph-search">
            <SearchIcon />
            <input
              className="graph-input"
              type="search"
              value={state.query ?? ""}
              onChange={(event) => patch({ query: event.target.value || undefined })}
              placeholder="Search title, tag, type…"
              aria-label={`Search ${writingConfig.label.toLowerCase()}`}
            />
          </label>
          {ViewSwitcher}
        </div>
        <p className="graph-browser__lede">
          {writingConfig.description}
          <span className="graph-browser__count">{countLabel}</span>
        </p>
      </header>
      {view === "map" ? (
        <div className="graph-browser__grid">
          <div className="graph-panel graph-panel--center">
            <div className="graph-canvas-bar">
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
              {/* Only while a filter is on: it reports on the filter, and the
                  heading already gives the total. A map where everything is
                  faded looks identical to one that failed to render, so the
                  zero case is said in words. */}
              {hasSelection && (
                <div className="graph-status" role="status">
                  {mapMatchCount === 0 ? (
                    <span className="graph-status__empty">No pages match</span>
                  ) : (
                    <span>
                      {mapMatchCount} of {graph.nodes.length}
                    </span>
                  )}
                  <button
                    type="button"
                    className="graph-status__reset"
                    onClick={() => patch({ query: undefined, types: undefined, tags: undefined })}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
            <div className="graph-canvas" ref={canvasSlotRef}>
              <GraphCanvas
                graph={graph}
                height={canvasHeight}
                selected={selected?.id}
                emphasized={hasSelection ? mapMatchIds : undefined}
                drag={graphConfig.interaction.drag}
                hubLayout={graphConfig.layout.hubs}
                labelMode={graphConfig.layout.labels}
                labelSide={graphConfig.layout.labelSide}
                fitPad={narrow ? 30 : 44}
                bottomInset={narrow ? sheetInset : 0}
                zoomControls={!narrow}
                // One meaning for every node, hubs included. Clicking a hub
                // used to also dim the map down to its immediate neighbours,
                // which made the same gesture carry two very different
                // consequences with nothing in the glyph to say so — and
                // "immediate neighbours" was the wrong set anyway, since a
                // hub's entries can sit a further hop down a nested hub.
                onSelect={(id) => patch({ selected: id })}
              />
            </div>
          </div>

          <aside
            ref={panelRef}
            className={`graph-panel graph-panel--right preview-pane${sheetExpanded ? " is-expanded" : ""}`}
          >
            {selected ? (
              <Preview
                node={selected}
                graph={graph}
                nodeById={nodeById}
                onSelect={(id) => patch({ selected: id })}
                sheet={narrow ? { expanded: sheetExpanded, toggle: () => setSheetExpanded((open) => !open) } : undefined}
              />
            ) : (
              <Overview
                hubs={graph.hubs}
                counts={hubCounts}
                narrow={narrow}
                onSelect={(id) => patch({ selected: id })}
              />
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
        <TagIcon />
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
 * Panel shown while nothing is selected on the map.
 *
 * The hubs are the map's entry points, so they are listed as a way in — rows
 * that select, exactly like Preview's connection rows. Picking one here and
 * clicking it on the canvas are the same gesture with the same result.
 */
function Overview({
  hubs,
  counts,
  narrow,
  onSelect
}: {
  hubs: EntryNode[];
  counts: Map<string, number>;
  narrow: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <p className="preview-prompt">
        {`${narrow ? "Tap" : "Select"} a node on the map to see what it connects to.`}
      </p>
      {hubs.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-section__label">
            Hubs <span className="sidebar-section__count">{hubs.length}</span>
          </p>
          <HubList hubs={hubs} counts={counts} onSelect={onSelect} />
        </div>
      )}
    </>
  );
}

/**
 * Panel describing whatever node is selected on the map: the shared
 * NodeDetailPanel, as the homepage preview and the per-entry map use it, then
 * the node's connections.
 *
 * Its rows *select*, they do not navigate — the same division of labour
 * LocalGraphMap already documents. A reader following a chain of connections
 * is inspecting the graph, not leaving it, and a row that silently changes
 * the page costs them the map they were reading. Navigation stays the one
 * explicit action: "Open page".
 *
 * On a phone the panel is a bottom sheet, and `sheet` adds the toggle that
 * opens it up to the summary and connections.
 */
function Preview({
  node,
  graph,
  nodeById,
  onSelect,
  sheet
}: {
  node: EntryNode;
  graph: GraphIndex;
  nodeById: Map<string, EntryNode>;
  onSelect: (id: string) => void;
  sheet?: { expanded: boolean; toggle: () => void };
}) {
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

  const toggle =
    sheet && connections.length > 0 ? (
      <button
        type="button"
        className="node-panel__more"
        aria-expanded={sheet.expanded}
        onClick={sheet.toggle}
      >
        {connections.length} {connections.length === 1 ? "link" : "links"}
        <span aria-hidden="true">{sheet.expanded ? "▾" : "▴"}</span>
      </button>
    ) : undefined;

  return (
    <>
      <NodeDetailPanel node={node} size="large" showDate actions={toggle} />
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
// selection, query, types and tags — is session-only by design so the
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

function SearchIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      className="graph-search__icon"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * Marks the tag filter, which is the one chip in the bar whose label is not
 * accompanied by the glyph its subject is drawn with. Outlined rather than
 * filled, so it reads as a control next to the solid node glyphs beside it.
 */
function TagIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="graph-button__icon"
    >
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
      <circle cx={7} cy={7} r={1.3} fill="currentColor" stroke="none" />
    </svg>
  );
}
