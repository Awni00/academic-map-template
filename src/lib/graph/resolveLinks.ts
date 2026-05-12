import { writingEntryUrl } from "../routes/paths";
import type { EntryNode, EntryRecord, ResolvedReference, WikilinkMatch, WritingEntryLike } from "./types";

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSlug(value: string): string {
  return normalizeKey(value.replace(/\.[^.]+$/, ""));
}

export function flattenedId(id: string): string {
  const fileName = id.split("/").filter(Boolean).at(-1) ?? id;
  return normalizeSlug(fileName);
}

export function slugForEntry(entry: WritingEntryLike): string {
  return normalizeSlug(entry.data.slug ?? flattenedId(entry.id));
}

export function entryToRecord<TEntry extends WritingEntryLike>(
  entry: TEntry,
  route?: string
): EntryRecord<TEntry> {
  const slug = slugForEntry(entry);
  return {
    entry,
    aliases: entry.data.aliases ?? [],
    body: entry.body ?? "",
    node: {
      id: slug,
      slug,
      title: entry.data.title,
      type: entry.data.type,
      tags: entry.data.tags ?? [],
      summary: entry.data.summary,
      date: entry.data.date,
      updated: entry.data.updated,
      url: writingEntryUrl(slug, route),
      draft: entry.data.draft
    }
  };
}

export function extractWikilinks(body: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  const pattern = /\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const raw = match[0];
    const [targetPart, labelPart] = match[1].split("|");
    const target = targetPart.trim();
    const label = (labelPart ?? targetPart).trim();
    if (target) matches.push({ raw, target, label });
  }
  return matches;
}

export function createEntryResolver(records: EntryRecord[]) {
  const bySlug = new Map<string, EntryNode>();
  const byExactAlias = new Map<string, EntryNode>();
  const byNormalizedTitle = new Map<string, EntryNode>();
  const byNormalizedAlias = new Map<string, EntryNode>();

  for (const record of records) {
    bySlug.set(record.node.slug, record.node);
    bySlug.set(record.entry.id, record.node);
    byNormalizedTitle.set(normalizeKey(record.node.title), record.node);
    for (const alias of record.aliases) {
      byExactAlias.set(alias, record.node);
      byNormalizedAlias.set(normalizeKey(alias), record.node);
    }
  }

  return function resolveReference(input: string): ResolvedReference {
    const clean = input.trim();
    const normalized = normalizeKey(clean);
    const target =
      bySlug.get(clean) ??
      byExactAlias.get(clean) ??
      bySlug.get(normalized) ??
      byNormalizedTitle.get(normalized) ??
      byNormalizedAlias.get(normalized);
    return target ? { input, target } : { input, reason: "unresolved" };
  };
}

export function dedupeSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
