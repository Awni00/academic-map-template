import { writingConfig } from "../../config/writing";
import { dedupeSorted, createEntryResolver, entryToRecord, extractWikilinks } from "./resolveLinks";
import type { EntryRecord, GraphBuildResult, GraphEdge, GraphWarning, WritingEntryLike } from "./types";

export function buildEntryRecords<TEntry extends WritingEntryLike>(
  entries: TEntry[],
  options: { includeDrafts?: boolean; route?: string } = {}
): EntryRecord<TEntry>[] {
  return entries
    .filter((entry) => options.includeDrafts || entry.data.draft !== true)
    .map((entry) => entryToRecord(entry, options.route));
}

export function detectDuplicateSlugs(records: EntryRecord[]): GraphWarning[] {
  const bySlug = new Map<string, EntryRecord[]>();
  for (const record of records) {
    const group = bySlug.get(record.node.slug) ?? [];
    group.push(record);
    bySlug.set(record.node.slug, group);
  }
  return [...bySlug.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([slug, group]) => ({
      type: "duplicate-slug",
      entry: slug,
      message: `Duplicate writing slug "${slug}" from ${group.map((record) => record.entry.id).join(", ")}.`
    }));
}

export function buildGraphIndex<TEntry extends WritingEntryLike>(
  entries: TEntry[],
  options: { includeDrafts?: boolean; route?: string; collectWarnings?: boolean } = {}
): GraphBuildResult {
  const records = buildEntryRecords(entries, options);
  const warnings: GraphWarning[] = detectDuplicateSlugs(records);
  const resolve = createEntryResolver(records);
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const record of records) {
    if (!record.node.summary) {
      warnings.push({
        type: "missing-summary",
        entry: record.node.id,
        message: `Writing entry "${record.node.title}" has no summary.`
      });
    }

    for (const link of record.entry.data.links ?? []) {
      const resolved = resolve(link);
      if (!resolved.target) {
        warnings.push({
          type: "unresolved-frontmatter-link",
          entry: record.node.id,
          target: link,
          message: `Unresolved frontmatter link "${link}" in "${record.node.title}".`
        });
        continue;
      }
      addEdge(edgeKeys, edges, record.node.id, resolved.target.id);
    }

    for (const wikilink of extractWikilinks(record.body)) {
      const resolved = resolve(wikilink.target);
      if (!resolved.target) {
        warnings.push({
          type: "unresolved-wikilink",
          entry: record.node.id,
          target: wikilink.target,
          message: `Unresolved wikilink "${wikilink.target}" in "${record.node.title}".`
        });
        continue;
      }
      addEdge(edgeKeys, edges, record.node.id, resolved.target.id);
    }
  }

  const nodes = records.map((record) => record.node);
  const backlinks: Record<string, string[]> = Object.fromEntries(nodes.map((node) => [node.id, []]));
  const outgoing: Record<string, string[]> = Object.fromEntries(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    outgoing[edge.source].push(edge.target);
    backlinks[edge.target].push(edge.source);
  }
  for (const node of nodes) {
    outgoing[node.id] = dedupeSorted(outgoing[node.id]);
    backlinks[node.id] = dedupeSorted(backlinks[node.id]);
  }

  if (nodes.length > 0 && edges.length === 0) {
    warnings.push({
      type: "empty-graph",
      message: "Writing entries were found, but no graph edges were created."
    });
  }

  return {
    index: {
      nodes,
      edges,
      backlinks,
      outgoing,
      hubs: nodes.filter((node) => node.type === "hub")
    },
    warnings: options.collectWarnings === false ? [] : warnings
  };
}

export function graphWarningSeverity(warning: GraphWarning): "warn" | "error" | "ignore" {
  if (warning.type === "unresolved-wikilink") {
    return writingConfig.validation.links.unresolvedWikilinks;
  }
  if (warning.type === "unresolved-frontmatter-link") {
    return writingConfig.validation.links.unresolvedFrontmatterLinks;
  }
  if (warning.type === "duplicate-slug") return "error";
  return "warn";
}

function addEdge(keys: Set<string>, edges: GraphEdge[], source: string, target: string): void {
  if (source === target) return;
  const key = `${source}->${target}`;
  if (keys.has(key)) return;
  keys.add(key);
  edges.push({ source, target });
}
