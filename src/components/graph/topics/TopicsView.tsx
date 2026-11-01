import { useEffect, useMemo, useRef, useState } from "react";

import { getEntryType, isHubType, writingConfig, type TopicsDensity, type TopicsSort } from "../../../config";
import type { EntryNode, GraphIndex } from "../../../lib/graph/types";
import NodeIcon, { type NodeShape } from "../NodeIcon";
import HubSection from "./HubSection";
import { sortEntries } from "./sort";

type TopicsViewProps = {
  graph: GraphIndex;
  /** The pages the toolbar's search and filters leave. */
  entries: EntryNode[];
  sort: TopicsSort;
  density: TopicsDensity;
};

function linkedEntriesFor(hub: EntryNode, graph: GraphIndex): string[] {
  return [
    ...new Set([...(graph.linkedFrom[hub.id] ?? []), ...(graph.linksTo[hub.id] ?? [])])
  ].filter((id) => id !== hub.id);
}

const sectionId = (hub: EntryNode) => `topic-${hub.id.replace(/[^a-z0-9-]+/gi, "-")}`;

/**
 * Every hub with the pages linked to it, and from tablet width up a rail of
 * the hubs beside them: a table of contents that follows the scroll and jumps
 * on click. A hub with no page left by the filters drops out of both.
 */
export default function TopicsView({ graph, entries, sort, density }: TopicsViewProps) {
  const config = writingConfig.browser.topics;
  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const sections = useMemo(() => {
    const visible = new Set(entries.map((e) => e.id));
    return graph.hubs
      .map((hub) => {
        const linked = linkedEntriesFor(hub, graph)
          .filter((id) => visible.has(id))
          .map((id) => nodeById.get(id))
          .filter((node): node is EntryNode => Boolean(node) && !isHubType(node!.type));
        return { hub, entries: sortEntries(linked, sort) };
      })
      .filter((section) => section.entries.length > 0);
  }, [graph, entries, nodeById, sort]);

  const [current, setCurrent] = useState<string | undefined>(undefined);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // The rail marks the section being read: the last one whose top has passed
  // the upper third of the screen.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !("IntersectionObserver" in window)) return;
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) seen.set(record.target.id, record.isIntersecting);
        const first = sections.find(({ hub }) => seen.get(sectionId(hub)));
        if (first) setCurrent(first.hub.id);
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    body.querySelectorAll(".topics-hub").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) {
    return <p className="wb-empty">No pages match the search and filters.</p>;
  }

  return (
    <div className="topicspage">
      <nav className="topics-rail" aria-label="Hubs">
        <p className="wb-panel__label">Hubs</p>
        {sections.map(({ hub, entries: linked }) => {
          const hubType = getEntryType(hub.type);
          const isCurrent = (current ?? sections[0].hub.id) === hub.id;
          return (
            <button
              key={hub.id}
              type="button"
              className="topics-rail__item"
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => {
                setCurrent(hub.id);
                document.getElementById(sectionId(hub))?.scrollIntoView({ block: "start" });
              }}
            >
              <NodeIcon shape={hubType.graph.shape as NodeShape} color={hubType.graph.color as string} />
              <span className="topics-rail__title">{hub.title}</span>
              <span className="topics-rail__count">{linked.length}</span>
            </button>
          );
        })}
      </nav>
      <div className="topicspage-body" ref={bodyRef}>
        {sections.map(({ hub, entries: linked }) => (
          <HubSection
            key={hub.id}
            id={sectionId(hub)}
            hub={hub}
            entries={linked}
            config={config}
            density={density}
          />
        ))}
      </div>
    </div>
  );
}
