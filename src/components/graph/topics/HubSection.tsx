import { useEffect, useState } from "react";

import { getEntryType, type TopicsConfig, type TopicsDensity } from "../../../config";
import type { EntryNode } from "../../../lib/graph/types";
import Icon from "../browser/icons";
import PagedList from "./PagedList";
import PreviewList from "./PreviewList";

type HubSectionProps = {
  id: string;
  hub: EntryNode;
  /** The hub's pages, already filtered and sorted by TopicsView. */
  entries: EntryNode[];
  config: TopicsConfig;
  density: TopicsDensity;
};

export default function HubSection({ id, hub, entries, config, density }: HubSectionProps) {
  const [page, setPage] = useState(1);
  // A new order or filter starts the hub's list from its first page again.
  useEffect(() => setPage(1), [entries]);

  const showSummary = config.showHubSummaries && Boolean(hub.summary);

  return (
    <section className="topics-hub" id={id}>
      <p className="topics-hub__kicker">{getEntryType(hub.type).label}</p>
      <header className="topics-hub__head">
        <h2 className="topics-hub__title">
          <a href={hub.url}>{hub.title}</a>
        </h2>
        <a className="btn btn--outline btn--small" href={hub.url}>
          Open hub
          <Icon name="arrow" className="btn__arrow" />
        </a>
      </header>
      {showSummary && <p className="topics-hub__sum">{hub.summary}</p>}
      <p className="topics-hub__meta">
        {entries.length} {entries.length === 1 ? "page" : "pages"}
      </p>
      {config.paginationMode === "paged" ? (
        <PagedList
          entries={entries}
          pageSize={config.pageSize}
          page={page}
          onPageChange={setPage}
          density={density}
          hubUrl={hub.url}
        />
      ) : (
        <PreviewList entries={entries} pageSize={config.pageSize} density={density} hubUrl={hub.url} />
      )}
    </section>
  );
}
