import { writingConfig } from "../../config/writing";
import {
  aliasKey,
  canonicalizeWritingPath,
  dedupeSorted,
  createEntryResolver,
  entryToRecord,
  extractWikilinks
} from "./resolveLinks";
import type { EntryRecord, GraphBuildResult, GraphEdge, GraphWarning, WritingEntryLike } from "./types";

export function buildEntryRecords<TEntry extends WritingEntryLike>(
  entries: TEntry[],
  options: { includeDrafts?: boolean; route?: string } = {}
): EntryRecord<TEntry>[] {
  return entries
    .filter((entry) => options.includeDrafts || entry.data.draft !== true)
    .map((entry) => entryToRecord(entry, options.route));
}

export function detectDuplicatePaths(records: EntryRecord[]): GraphWarning[] {
  const byPath = new Map<string, EntryRecord[]>();
  for (const record of records) {
    const group = byPath.get(record.node.path) ?? [];
    group.push(record);
    byPath.set(record.node.path, group);
  }
  return [...byPath.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([entryPath, group]) => ({
      type: "duplicate-path",
      entry: entryPath,
      message: `Duplicate writing path "${entryPath}" from ${group.map((record) => record.entry.id).join(", ")}.`
    }));
}

export function buildGraphIndex<TEntry extends WritingEntryLike>(
  entries: TEntry[],
  options: { includeDrafts?: boolean; route?: string; collectWarnings?: boolean } = {}
): GraphBuildResult {
  const records = buildEntryRecords(entries, options);
  const warnings: GraphWarning[] = [
    ...detectDuplicatePaths(records),
    ...detectInvalidPaths(records),
    ...detectAliasIssues(records)
  ];
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
      const resolved = resolve(link, record.node.path);
      if (!resolved.target) {
        if (resolved.reason === "ambiguous") {
          warnings.push({
            type: "ambiguous-reference",
            entry: record.node.id,
            target: link,
            message: `Ambiguous frontmatter link "${link}" in "${record.node.title}".`
          });
          continue;
        }
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
      const resolved = resolve(wikilink.target, record.node.path);
      if (!resolved.target) {
        if (resolved.reason === "ambiguous") {
          warnings.push({
            type: "ambiguous-reference",
            entry: record.node.id,
            target: wikilink.target,
            message: `Ambiguous wikilink "${wikilink.target}" in "${record.node.title}".`
          });
          continue;
        }
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
  if (
    warning.type === "duplicate-path" ||
    warning.type === "duplicate-alias" ||
    warning.type === "alias-path-collision" ||
    warning.type === "reserved-path" ||
    warning.type === "root-writing-index" ||
    warning.type === "ambiguous-reference"
  ) {
    return "error";
  }
  return "warn";
}

function addEdge(keys: Set<string>, edges: GraphEdge[], source: string, target: string): void {
  if (source === target) return;
  const key = `${source}->${target}`;
  if (keys.has(key)) return;
  keys.add(key);
  edges.push({ source, target });
}

function detectInvalidPaths(records: EntryRecord[]): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  const reserved = reservedWritingPaths();
  for (const record of records) {
    if (!record.node.path) {
      warnings.push({
        type: "root-writing-index",
        entry: record.entry.id,
        message: `Root writing entry "${record.entry.id}" is not allowed because ${writingConfig.route} is the writing browser.`
      });
    }
    if (reserved.has(record.node.path)) {
      warnings.push({
        type: "reserved-path",
        entry: record.node.path,
        message: `Writing entry path "${record.node.path}" conflicts with a reserved writing route.`
      });
    }
  }
  return warnings;
}

function detectAliasIssues(records: EntryRecord[]): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  const pathOwners = new Map(records.map((record) => [record.node.path, record]));
  const aliasOwners = new Map<string, EntryRecord[]>();

  for (const record of records) {
    const seenInEntry = new Set<string>();
    for (const alias of record.aliases) {
      const key = aliasKey(alias);
      if (!key) continue;

      const aliasAsPath = canonicalizeWritingPath(alias);
      const pathOwner = pathOwners.get(aliasAsPath);
      if (pathOwner && pathOwner.node.path !== record.node.path) {
        warnings.push({
          type: "alias-path-collision",
          entry: record.node.path,
          target: alias,
          message: `Alias "${alias}" on "${record.node.title}" collides with writing path "${pathOwner.node.path}".`
        });
      }

      if (seenInEntry.has(key)) {
        warnings.push({
          type: "duplicate-alias",
          entry: record.node.path,
          target: alias,
          message: `Duplicate alias "${alias}" in "${record.node.title}".`
        });
      }
      seenInEntry.add(key);

      const owners = aliasOwners.get(key) ?? [];
      owners.push(record);
      aliasOwners.set(key, owners);
    }
  }

  for (const [key, owners] of aliasOwners) {
    const uniqueOwners = [...new Map(owners.map((owner) => [owner.node.path, owner])).values()];
    if (uniqueOwners.length <= 1) continue;
    warnings.push({
      type: "duplicate-alias",
      target: key,
      message: `Duplicate alias "${key}" across ${uniqueOwners.map((owner) => owner.node.path).join(", ")}.`
    });
  }

  return warnings;
}

function reservedWritingPaths(): Set<string> {
  const route = stripSlashes(writingConfig.route);
  const rssRoute = stripSlashes(writingConfig.rss.route);
  const reserved = new Set<string>();
  if (rssRoute.startsWith(`${route}/`)) reserved.add(rssRoute.slice(route.length + 1));
  return reserved;
}

function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}
