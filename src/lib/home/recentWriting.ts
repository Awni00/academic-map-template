import type { RecentWritingSelect } from "../../config/types";
import type { EntryNode } from "../graph/types";

/**
 * The entries for the homepage carousel.
 *
 * Only dated entries of a type that opts into the row qualify; `select` then
 * decides the order. "featured-first" is the default so that setting
 * `featured: true` on an entry does something without further config. Within
 * each group the newest comes first, and equal dates fall back to the title so
 * the row is the same on every build.
 */
export function selectRecentWriting(
  nodes: readonly EntryNode[],
  options: {
    select: RecentWritingSelect;
    maxItems: number;
    includeType: (type: EntryNode["type"]) => boolean;
  }
): EntryNode[] {
  const eligible = nodes
    .filter((node) => node.date && !node.draft && options.includeType(node.type))
    .sort(
      (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title)
    );

  const featured = eligible.filter((node) => node.featured);
  const ordered =
    options.select === "featured"
      ? featured
      : options.select === "featured-first"
        ? [...featured, ...eligible.filter((node) => !node.featured)]
        : eligible;

  return ordered.slice(0, Math.max(0, options.maxItems));
}
