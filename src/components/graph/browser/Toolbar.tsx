import {
  getEntryType,
  writingConfig,
  type EntryType,
  type TopicsDensity,
  type TopicsSort,
  type TopicsSortField
} from "../../../config";
import DensityToggle from "../DensityToggle";
import NodeIcon, { type NodeShape } from "../NodeIcon";
import { DEFAULT_DIR, SORT_LABELS } from "../topics/sort";
import Icon from "./icons";
import ToolbarMenu from "./ToolbarMenu";

type ToolbarProps = {
  query: string;
  onQuery: (query: string) => void;
  types: EntryType[];
  tags: string[];
  typeCounts: Record<string, number>;
  allTags: string[];
  onToggleType: (type: EntryType) => void;
  onToggleTag: (tag: string) => void;
  onClearFilters: () => void;
  /** Pages the filters leave, out of `total`. */
  matches: number;
  total: number;
  /** Topics and List; the map has no order to choose. */
  sort?: {
    options: readonly TopicsSortField[];
    value: TopicsSort;
    onChange: (sort: TopicsSort) => void;
  };
  density?: { value: TopicsDensity; onChange: (density: TopicsDensity) => void };
};

const pages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;

/**
 * The row of controls every view shares: search, Filters, Sort, the filters
 * that are on (removable), and how many pages they leave. One row in the same
 * place in each view, so switching views never moves a control.
 */
export default function Toolbar({
  query,
  onQuery,
  types,
  tags,
  typeCounts,
  allTags,
  onToggleType,
  onToggleTag,
  onClearFilters,
  matches,
  total,
  sort,
  density
}: ToolbarProps) {
  const label = writingConfig.label.toLowerCase();
  const active = types.length + tags.length;
  const filtering = active > 0 || query.length > 0;

  return (
    <div className="wb-toolbar" data-filtering={filtering || undefined}>
      <label className="wb-search">
        <Icon name="search" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={`Search ${label}`}
          aria-label={`Search ${label}`}
        />
      </label>

      <ToolbarMenu label="Filters" icon="filters" badge={active}>
        {(close) => (
          <div className="wb-filters">
            <p className="wb-panel__label">Type</p>
            <div className="wb-chips">
              {writingConfig.entryTypes
                .filter((type) => (typeCounts[type] ?? 0) > 0)
                .map((type) => {
                  const entryType = getEntryType(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      className="wb-chip"
                      aria-pressed={types.includes(type)}
                      onClick={() => onToggleType(type)}
                    >
                      <NodeIcon
                        shape={entryType.graph.shape as NodeShape}
                        color={entryType.graph.color as string}
                      />
                      {entryType.label}
                      <span className="wb-chip__count">{typeCounts[type]}</span>
                    </button>
                  );
                })}
            </div>
            {allTags.length > 0 && (
              <>
                <p className="wb-panel__label">Tags</p>
                <div className="wb-chips">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="wb-chip"
                      aria-pressed={tags.includes(tag)}
                      onClick={() => onToggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="wb-panel__foot">
              <button type="button" className="wb-text-button" onClick={onClearFilters} disabled={!active}>
                Clear all
              </button>
              <button type="button" className="wb-done" onClick={close}>
                Show {pages(matches)}
              </button>
            </div>
          </div>
        )}
      </ToolbarMenu>

      {sort && sort.options.length > 0 && (
        <ToolbarMenu
          label="Sort"
          icon="sort"
          text={`${SORT_LABELS[sort.value.field]} ${sort.value.dir === "desc" ? "↓" : "↑"}`}
        >
          {(close) => (
            <div className="wb-sort">
              <p className="wb-panel__label">Sort by</p>
              {sort.options.map((field) => {
                const current = sort.value.field === field;
                return (
                  <button
                    key={field}
                    type="button"
                    className="wb-option"
                    aria-pressed={current}
                    onClick={() => {
                      // Picking the current field again reverses it.
                      sort.onChange(
                        current
                          ? { field, dir: sort.value.dir === "desc" ? "asc" : "desc" }
                          : { field, dir: DEFAULT_DIR[field] }
                      );
                      close();
                    }}
                  >
                    {SORT_LABELS[field]}
                    {current && (
                      <span className="wb-option__dir">
                        {sort.value.dir === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                );
              })}
              {density && (
                <>
                  <p className="wb-panel__label">Rows</p>
                  <DensityToggle density={density.value} onDensity={density.onChange} />
                </>
              )}
            </div>
          )}
        </ToolbarMenu>
      )}

      {active > 0 && (
        <div className="wb-active" aria-label="Filters on">
          {types.map((type) => (
            <button key={type} type="button" className="wb-active__chip" onClick={() => onToggleType(type)}>
              {getEntryType(type).label}
              <Icon name="close" />
              <span className="visually-hidden">Remove filter</span>
            </button>
          ))}
          {tags.map((tag) => (
            <button key={tag} type="button" className="wb-active__chip" onClick={() => onToggleTag(tag)}>
              {tag}
              <Icon name="close" />
              <span className="visually-hidden">Remove filter</span>
            </button>
          ))}
        </div>
      )}

      {/* Said in words when nothing matches: a map where everything is faded
          looks the same as one that failed to draw. */}
      <p className="wb-count" role="status">
        {filtering
          ? matches === 0
            ? "No pages match"
            : `${matches} of ${pages(total)}`
          : pages(total)}
      </p>
    </div>
  );
}
