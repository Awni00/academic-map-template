import { useMemo } from "react";

import type { TopicsDensity, TopicsSort, TopicsSortField } from "../../../config";
import type { EntryNode } from "../../../lib/graph/types";
import EntryRow from "../browser/EntryRow";
import { DEFAULT_DIR, sortEntries } from "../topics/sort";

type ListViewProps = {
  /** The pages the toolbar's search and filters leave. */
  entries: EntryNode[];
  sort: TopicsSort;
  sortOptions: readonly TopicsSortField[];
  onSort: (sort: TopicsSort) => void;
  density: TopicsDensity;
};

/**
 * Every page in one list. From tablet width up the rows line up as columns
 * under a sticky header whose labels also sort, the same sort the toolbar's
 * Sort menu sets; on a phone the header goes and the rows stack.
 */
export default function ListView({ entries, sort, sortOptions, onSort, density }: ListViewProps) {
  const sorted = useMemo(() => sortEntries(entries, sort), [entries, sort]);

  const header = (field: TopicsSortField | undefined, label: string, className: string) => {
    if (!field || !sortOptions.includes(field)) return <span className={className}>{label}</span>;
    const current = sort.field === field;
    return (
      <button
        type="button"
        className={className}
        aria-pressed={current}
        onClick={() =>
          onSort(
            current
              ? { field, dir: sort.dir === "desc" ? "asc" : "desc" }
              : { field, dir: DEFAULT_DIR[field] }
          )
        }
      >
        {label}
        {current && <span aria-hidden="true">{sort.dir === "desc" ? " ↓" : " ↑"}</span>}
      </button>
    );
  };

  if (sorted.length === 0) {
    return <p className="wb-empty">No pages match the search and filters.</p>;
  }

  return (
    <div className="listpage wb-rows-host">
      <div className="wb-colhead">
        {header("type", "Type", "wb-colhead__type")}
        {header("title", "Title", "wb-colhead__title")}
        {header(undefined, "Tags", "wb-colhead__tags")}
        {header("date", "Date", "wb-colhead__date")}
      </div>
      <ul className="wb-rows wb-rows--tags">
        {sorted.map((entry) => (
          <EntryRow key={entry.id} entry={entry} density={density} showTags />
        ))}
      </ul>
    </div>
  );
}
