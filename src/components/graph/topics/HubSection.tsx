import { useMemo, useState } from "react";

import { getEntryType, isHubType, type TopicsConfig, type TopicsDensity, type TopicsSort } from "../../../config";
import type { EntryNode, GraphIndex } from "../../../lib/graph/types";
import PagedList from "./PagedList";
import PreviewList from "./PreviewList";
import SortBar from "./SortBar";
import { DEFAULT_DIR, sortEntries } from "./sort";

type HubSectionProps = {
  hub: EntryNode;
  graph: GraphIndex;
  visibleEntries: Set<string>;
  nodeById: Map<string, EntryNode>;
  config: TopicsConfig;
  density: TopicsDensity;
  showDensityToggle: boolean;
  onDensity: (d: TopicsDensity) => void;
};

function linkedEntriesFor(hub: EntryNode, graph: GraphIndex): string[] {
  return [
    ...new Set([...(graph.linkedFrom[hub.id] ?? []), ...(graph.linksTo[hub.id] ?? [])])
  ].filter((id) => id !== hub.id);
}

export default function HubSection({
  hub,
  graph,
  visibleEntries,
  nodeById,
  config,
  density,
  showDensityToggle,
  onDensity
}: HubSectionProps) {
  const [sort, setSort] = useState<TopicsSort>(config.defaultSort);
  const [page, setPage] = useState(1);

  const linked = useMemo(() => {
    const ids = linkedEntriesFor(hub, graph).filter((id) => visibleEntries.has(id));
    const entries: EntryNode[] = [];
    for (const id of ids) {
      const node = nodeById.get(id);
      if (node && !isHubType(node.type)) entries.push(node);
    }
    return sortEntries(entries, sort);
  }, [hub, graph, visibleEntries, nodeById, sort]);

  if (linked.length === 0) return null;

  const showSummary = config.showHubSummaries && Boolean(hub.summary);

  return (
    <section className="topics-hub">
      <header className="topics-hub__head">
        <div className="topics-hub__heading">
          <span className="topics-hub__kicker">{getEntryType(hub.type).label}</span>
          <a className="topics-hub__title" href={hub.url}>
            {hub.title}
          </a>
        </div>
        <div className="topics-hub__actions">
          <a className="topics-hub__open" href={hub.url}>
            Open hub →
          </a>
        </div>
      </header>
      {showSummary && <p className="topics-hub__sum">{hub.summary}</p>}
      <div className="topics-hub__meta">
        <strong>
          {linked.length} {linked.length === 1 ? "entry" : "entries"}
        </strong>{" "}
        linked
      </div>
      <SortBar
        sortOptions={config.sortOptions}
        activeSort={sort}
        onSort={(field) => {
          setSort((current) =>
            current.field === field
              ? { field, dir: current.dir === "desc" ? "asc" : "desc" }
              : { field, dir: DEFAULT_DIR[field] }
          );
          setPage(1);
        }}
        showDensityToggle={showDensityToggle}
        density={density}
        onDensity={onDensity}
      />
      {config.paginationMode === "paged" ? (
        <PagedList
          entries={linked}
          pageSize={config.pageSize}
          page={page}
          onPageChange={setPage}
          density={density}
          hubUrl={hub.url}
        />
      ) : (
        <PreviewList
          entries={linked}
          pageSize={config.pageSize}
          density={density}
          hubUrl={hub.url}
        />
      )}
    </section>
  );
}
