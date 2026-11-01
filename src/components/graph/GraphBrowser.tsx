import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  getEntryType,
  graphConfig,
  writingConfig,
  type EntryType,
  type TopicsDensity,
  type TopicsSort
} from "../../config";
import type { Box } from "../../lib/graph/labelLayout";
import type { EntryNode, GraphIndex, WritingBrowserState } from "../../lib/graph/types";
import { hubMemberCounts } from "../../lib/graph/clusterLayout";
import { searchWriting, toSearchDocuments } from "../../lib/search/writingSearch";
import GraphCanvas from "./GraphCanvas";
import HubList from "./HubList";
import NodeDetailPanel from "./NodeDetailPanel";
import NodeIcon, { type NodeShape } from "./NodeIcon";
import Icon, { type IconName } from "./browser/icons";
import Toolbar from "./browser/Toolbar";
import TypeLabel from "./browser/TypeLabel";
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

const VIEW_LABEL: Record<View, string> = { map: "Map", topics: "Topics", list: "List" };

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
  const legendRef = useRef<HTMLUListElement | null>(null);
  // Where the legend sits over the canvas, so labels and the fit avoid it.
  const [legendBox, setLegendBox] = useState<Box | null>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((node) => node.tags))].sort(), [graph.nodes]);
  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const node of graph.nodes) out[node.type] = (out[node.type] ?? 0) + 1;
    return out;
  }, [graph.nodes]);
  const docs = useMemo(() => toSearchDocuments(graph.nodes), [graph.nodes]);
  const hubCounts = useMemo(() => hubMemberCounts(graph.nodes), [graph.nodes]);
  // One filter for every view: the toolbar is the same in each, so search,
  // types and tags mean the same thing wherever they are set. Topics and List
  // show only what matches. The map marks the matches and fades the rest
  // instead of removing them: node types are not connected subgraphs, so
  // removal left isolated dots, and handing the canvas a new graph re-settles
  // the layout on every click.
  const searchResults = useMemo(
    () => searchWriting(docs, { query: state.query, types: state.types, tags: state.tags }),
    [docs, state.query, state.types, state.tags]
  );
  const mapMatchIds = useMemo(() => new Set(searchResults.map((doc) => doc.id)), [searchResults]);
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
  // Order and density per view, starting from each view's config.
  const browserConfig = writingConfig.browser;
  const [topicsSort, setTopicsSort] = useState<TopicsSort>(browserConfig.topics.defaultSort);
  const [listSort, setListSort] = useState<TopicsSort>(browserConfig.list.defaultSort);
  const [topicsDensity, setTopicsDensity] = useState<TopicsDensity>(browserConfig.topics.density);
  const [listDensity, setListDensity] = useState<TopicsDensity>(browserConfig.list.density);

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

  // Measure the legend against the canvas slot. It wraps with the canvas
  // width, and is hidden (zero-sized) on a phone, where nothing need avoid it.
  useLayoutEffect(() => {
    const legend = legendRef.current;
    const slot = canvasSlotRef.current;
    if (view !== "map" || !legend || !slot) return;
    const measure = () => {
      const l = legend.getBoundingClientRect();
      const c = slot.getBoundingClientRect();
      setLegendBox((current) => {
        const next =
          l.width && l.height
            ? { x0: l.left - c.left, y0: l.top - c.top, x1: l.right - c.left, y1: l.bottom - c.top }
            : null;
        const same =
          current && next && (["x0", "y0", "x1", "y1"] as const).every((key) => Math.abs(current[key] - next[key]) < 0.5);
        return same || current === next ? current : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(legend);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [view, narrow]);

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

  const matchedEntries = searchResults
    .map((doc) => nodeById.get(doc.id))
    .filter((node): node is EntryNode => Boolean(node));

  const sortControls =
    view === "topics"
      ? {
          sort: { options: browserConfig.topics.sortOptions, value: topicsSort, onChange: setTopicsSort },
          density: browserConfig.topics.showDensityToggle
            ? { value: topicsDensity, onChange: setTopicsDensity }
            : undefined
        }
      : view === "list"
        ? {
            sort: { options: browserConfig.list.sortOptions, value: listSort, onChange: setListSort },
            density: browserConfig.list.showDensityToggle
              ? { value: listDensity, onChange: setListDensity }
              : undefined
          }
        : {};

  const presentTypes = writingConfig.entryTypes.filter((type) => (typeCounts[type] ?? 0) > 0);

  return (
    <section className="graph-browser" data-view={view} aria-label={`${writingConfig.label} browser`}>
      {/* The page's own header, set like every other top-level page's: the
          serif title, the view switcher beside it, a line of description on
          wide screens, and then the toolbar every view shares. */}
      <header className="graph-browser__head">
        <h1 className="graph-browser__title">{writingConfig.label}</h1>
        <div className="wb-switch" role="tablist" aria-label={`${writingConfig.label} view`}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              aria-label={VIEW_LABEL[v]}
              onClick={() => patch({ view: v })}
            >
              <Icon name={v as IconName} />
              <span className="wb-switch__label">{VIEW_LABEL[v]}</span>
            </button>
          ))}
        </div>
        <p className="graph-browser__lede">{writingConfig.description}</p>
      </header>

      <Toolbar
        query={state.query ?? ""}
        onQuery={(query) => patch({ query: query || undefined })}
        types={state.types ?? []}
        tags={state.tags ?? []}
        typeCounts={typeCounts}
        allTags={tags}
        onToggleType={toggleType}
        onToggleTag={toggleTag}
        onClearFilters={() => patch({ types: undefined, tags: undefined })}
        matches={matchedEntries.length}
        total={graph.nodes.length}
        {...sortControls}
      />

      {view === "map" ? (
        <div className="graph-browser__grid">
          <div className="graph-panel graph-panel--center">
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
                obstacles={legendBox ? [legendBox] : undefined}
                zoomControls={!narrow}
                // One meaning for every node, hubs included. Clicking a hub
                // used to also dim the map down to its immediate neighbours,
                // which made the same gesture carry two very different
                // consequences with nothing in the glyph to say so — and
                // "immediate neighbours" was the wrong set anyway, since a
                // hub's entries can sit a further hop down a nested hub.
                onSelect={(id) => patch({ selected: id })}
              />
              {/* What the glyphs mean, on the map itself. Filtering lives in
                  the toolbar; this only reads. */}
              <ul className="graph-legend" aria-label="Legend" ref={legendRef}>
                {presentTypes.map((type) => (
                  <li key={type}>
                    <TypeLabel type={type} />
                  </li>
                ))}
              </ul>
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
        <TopicsView graph={graph} entries={matchedEntries} sort={topicsSort} density={topicsDensity} />
      ) : (
        <ListView
          entries={matchedEntries}
          sort={listSort}
          sortOptions={browserConfig.list.sortOptions}
          onSort={setListSort}
          density={listDensity}
        />
      )}
    </section>
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

