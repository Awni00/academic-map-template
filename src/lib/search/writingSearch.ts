import type { EntryType, EntryNode, WritingSearchDocument } from "../graph/types";

export function toSearchDocuments(nodes: EntryNode[]): WritingSearchDocument[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    summary: node.summary,
    tags: node.tags,
    type: node.type,
    date: node.date,
    url: node.url
  }));
}

export function searchWriting(
  docs: WritingSearchDocument[],
  options: { query?: string; types?: EntryType[]; tags?: string[] }
): WritingSearchDocument[] {
  const query = options.query?.trim().toLowerCase();
  const typeSet = options.types?.length ? new Set(options.types) : undefined;
  const tagSet = options.tags?.length ? new Set(options.tags) : undefined;

  return docs.filter((doc) => {
    if (typeSet && !typeSet.has(doc.type)) return false;
    if (tagSet && !doc.tags.some((tag) => tagSet.has(tag))) return false;
    if (!query) return true;
    const haystack = [doc.title, doc.summary, doc.type, ...doc.tags].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}
