import type { TopicsDensity } from "../../../config/writing";
import type { EntryNode } from "../../../lib/graph/types";
import EntryRow from "../browser/EntryRow";

type PagedListProps = {
  entries: EntryNode[];
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  density: TopicsDensity;
  hubUrl: string;
};

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

export default function PagedList({
  entries,
  pageSize,
  page,
  onPageChange,
  density,
  hubUrl
}: PagedListProps) {
  const total = entries.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const slice = entries.slice(start, start + pageSize);
  const showPager = total > pageSize;
  return (
    <>
      <ul className="wb-rows">
        {slice.map((entry) => (
          <EntryRow key={entry.id} entry={entry} density={density} />
        ))}
      </ul>
      {showPager && (
        <div className="topics-pager">
          <span className="topics-pager__caption">
            {start + 1}–{Math.min(start + pageSize, total)} of {total}
          </span>
          <span className="topics-pager__pages">
            <button
              type="button"
              className="topics-pager__nav"
              disabled={safePage === 1}
              onClick={() => onPageChange(safePage - 1)}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            {pageWindow(safePage, pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="topics-pager__gap">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={p === safePage ? "topics-pager__page is-active" : "topics-pager__page"}
                  aria-current={p === safePage ? "page" : undefined}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className="topics-pager__nav"
              disabled={safePage === pageCount}
              onClick={() => onPageChange(safePage + 1)}
              aria-label="Next page"
            >
              Next →
            </button>
          </span>
          <a className="topics-pager__open" href={hubUrl}>
            Open hub for the full list →
          </a>
        </div>
      )}
    </>
  );
}
