import type { TopicsDensity } from "../../../config";
import { formatDate } from "../../../lib/dates";
import type { EntryNode } from "../../../lib/graph/types";
import TypeLabel from "./TypeLabel";

type EntryRowProps = {
  entry: EntryNode;
  density: TopicsDensity;
  /** The List view's tag column; Topics leaves tags to the hub. */
  showTags?: boolean;
};

/**
 * One page in the Topics or List view: type, title and summary, date.
 *
 * The whole row is the link. It lays itself out by the width of the list it
 * sits in (a container query on `.wb-rows`), not by the screen's: columns
 * when there is room, a meta line over the title when there is not. So the
 * same row works in the narrow column beside the Topics rail and across a
 * full-width list.
 */
export default function EntryRow({ entry, density, showTags = false }: EntryRowProps) {
  const showSummary = density === "comfortable" && Boolean(entry.summary);
  return (
    <li className={`wb-row wb-row--${density}`}>
      <a className="wb-row__link" href={entry.url}>
        <TypeLabel type={entry.type} className="wb-row__type" />
        <span className="wb-row__main">
          <span className="wb-row__title">
            {entry.title}
            {entry.mode === "abstract" && <span className="wb-row__mode">Abstract</span>}
          </span>
          {showSummary && <span className="wb-row__sum">{entry.summary}</span>}
        </span>
        {showTags && (
          <span className="wb-row__tags">
            {entry.tags.slice(0, 3).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </span>
        )}
        <time className="wb-row__date" dateTime={entry.date}>
          {formatDate(entry.date) ?? ""}
        </time>
      </a>
    </li>
  );
}
