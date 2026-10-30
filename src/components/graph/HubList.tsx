import { getEntryType } from "../../config";
import type { EntryNode } from "../../lib/graph/types";
import NodeIcon, { type NodeShape } from "./NodeIcon";

type HubListProps = {
  hubs: EntryNode[];
  /** Pages under each hub, at any depth (`hubMemberCounts`). */
  counts: Map<string, number>;
  onSelect: (id: string) => void;
};

/**
 * The hubs as a way into a map, before anything is selected.
 *
 * Shared by the full writing map and the homepage preview, so both open on the
 * same list. A row selects its hub — the same gesture, with the same result, as
 * clicking the hub on the canvas — and carries the number of pages under it,
 * so a reader can tell a large topic from a small one before choosing.
 */
export default function HubList({ hubs, counts, onSelect }: HubListProps) {
  if (hubs.length === 0) return null;
  return (
    <ul className="connection-list hub-list">
      {hubs.map((hub) => {
        const hubType = getEntryType(hub.type);
        const count = counts.get(hub.id) ?? 0;
        return (
          <li key={hub.id}>
            <button
              type="button"
              className="preview-link hub-list__row"
              onClick={() => onSelect(hub.id)}
              aria-label={`${hub.title}, ${count} ${count === 1 ? "page" : "pages"}`}
            >
              <NodeIcon shape={hubType.graph.shape as NodeShape} color={hubType.graph.color as string} />
              <span className="connection-title">{hub.title}</span>
              <span className="hub-list__count" aria-hidden="true">
                {count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
