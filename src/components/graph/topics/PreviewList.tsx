import type { TopicsDensity } from "../../../config/writing";
import type { EntryNode } from "../../../lib/graph/types";
import EntryRow from "../browser/EntryRow";

type PreviewListProps = {
  entries: EntryNode[];
  pageSize: number;
  density: TopicsDensity;
  hubUrl: string;
};

export default function PreviewList({ entries, pageSize, density, hubUrl }: PreviewListProps) {
  const shown = entries.slice(0, pageSize);
  const total = entries.length;
  const overflow = total > pageSize;
  return (
    <>
      <ul className="wb-rows">
        {shown.map((entry) => (
          <EntryRow key={entry.id} entry={entry} density={density} />
        ))}
      </ul>
      {overflow && (
        <div className="topics-preview-footer">
          <span className="topics-preview-footer__caption">
            {shown.length} of {total}
          </span>
          <a className="topics-preview-footer__link" href={hubUrl}>
            Open hub for the full list →
          </a>
        </div>
      )}
    </>
  );
}
