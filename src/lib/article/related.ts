import type { EntryNode, GraphIndex } from "../graph/types";

export type RelatedItem = { id: string; title: string; url: string };

/**
 * The "Related" list for one entry: every entry it links to or that links to
 * it, once each, sorted by title. Direction is not shown; the local graph is
 * where that lives.
 */
export function relatedEntries(
  graph: Pick<GraphIndex, "linksTo" | "linkedFrom">,
  byId: ReadonlyMap<string, Pick<EntryNode, "title" | "url">>,
  id: string
): RelatedItem[] {
  const ids = new Set([...(graph.linksTo[id] ?? []), ...(graph.linkedFrom[id] ?? [])]);
  ids.delete(id);
  return [...ids]
    .flatMap((relatedId) => {
      const node = byId.get(relatedId);
      return node ? [{ id: relatedId, title: node.title, url: node.url }] : [];
    })
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
