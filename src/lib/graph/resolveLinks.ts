import { writingEntryUrl } from "../routes/paths";
import type { EntryNode, EntryRecord, ResolvedReference, WikilinkMatch, WritingEntryLike } from "./types";

const INDEX_SEGMENT = "index";

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

export function normalizePathSegment(value: string): string {
  return normalizeSlug(value);
}

export function canonicalizeWritingPath(value: string): string {
  const segments = normalizeWritingPathSegments(value);
  if (segments.at(-1) === INDEX_SEGMENT) segments.pop();
  return segments.join("/");
}

export function sourceDirForEntryId(id: string): string {
  const segments = normalizeWritingPathSegments(id);
  if (segments.at(-1) === INDEX_SEGMENT) segments.pop();
  else segments.pop();
  return segments.join("/");
}

export function canonicalPathForEntry(entry: WritingEntryLike): string {
  return canonicalizeWritingPath(entry.id);
}

export function sourceDirForEntry(entry: WritingEntryLike): string {
  return sourceDirForEntryId(sourceIdForEntry(entry));
}

export function slugForEntry(entry: WritingEntryLike): string {
  return finalPathSegment(canonicalPathForEntry(entry));
}

export function entryToRecord<TEntry extends WritingEntryLike>(
  entry: TEntry,
  route?: string
): EntryRecord<TEntry> {
  const entryPath = canonicalPathForEntry(entry);
  const slug = finalPathSegment(entryPath);
  return {
    entry,
    aliases: entry.data.aliases ?? [],
    body: entry.body ?? "",
    sourceDir: sourceDirForEntry(entry),
    node: {
      id: entryPath,
      path: entryPath,
      slug,
      title: entry.data.title,
      type: entry.data.type,
      tags: entry.data.tags ?? [],
      summary: entry.data.summary,
      date: entry.data.date,
      updated: entry.data.updated,
      url: writingEntryUrl(entryPath, route),
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
  const byPath = new Map<string, EntryNode>();
  const sourceDirByPath = new Map<string, string>();
  const byNormalizedAlias = new Map<string, EntryNode[]>();

  for (const record of records) {
    byPath.set(record.node.path, record.node);
    sourceDirByPath.set(record.node.path, record.sourceDir);
    for (const alias of record.aliases) {
      const key = normalizeKey(alias);
      if (!key) continue;
      const candidates = byNormalizedAlias.get(key) ?? [];
      candidates.push(record.node);
      byNormalizedAlias.set(key, candidates);
    }
  }

  return function resolveReference(input: string, sourcePath?: string): ResolvedReference {
    const clean = input.trim();
    const resolvedPath = referencePath(clean, sourcePath ? sourceDirByPath.get(sourcePath) : undefined);
    if (resolvedPath !== undefined) {
      const target = byPath.get(resolvedPath);
      if (target) return { input, target };
    }

    if (!isPathReference(clean)) {
      const candidates = dedupeNodes(byNormalizedAlias.get(normalizeKey(clean)) ?? []);
      if (candidates.length === 1) return { input, target: candidates[0] };
      if (candidates.length > 1) return { input, reason: "ambiguous", candidates };
    }

    return { input, reason: "unresolved" };
  };
}

export function dedupeSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function finalPathSegment(entryPath: string): string {
  return entryPath.split("/").filter(Boolean).at(-1) ?? "";
}

export function referencePath(input: string, sourceDir?: string): string | undefined {
  const clean = input.trim();
  if (!clean) return undefined;

  const joined =
    clean.startsWith("./") || clean.startsWith("../")
      ? sourceDir === undefined
        ? undefined
        : joinRelativePath(sourceDir, clean)
      : clean.startsWith("/")
        ? clean.slice(1)
        : clean;

  if (joined === undefined || joined.startsWith("../") || joined === "..") return undefined;
  return canonicalizeWritingPath(joined);
}

export function isPathReference(input: string): boolean {
  return input.startsWith("/") || input.startsWith("./") || input.startsWith("../") || input.includes("/");
}

export function aliasKey(value: string): string {
  return normalizeKey(value);
}

function normalizeWritingPathSegments(value: string): string[] {
  const withoutExtension = value.replace(/\.(md|mdx)$/i, "");
  return withoutExtension
    .split(/[\\/]+/)
    .map((segment) => normalizePathSegment(segment))
    .filter(Boolean);
}

function sourceIdForEntry(entry: WritingEntryLike): string {
  if (!entry.filePath) return entry.id;
  const normalized = entry.filePath.replace(/\\/g, "/");
  const marker = "src/content/writing/";
  const markerIndex = normalized.lastIndexOf(marker);
  return markerIndex >= 0 ? normalized.slice(markerIndex + marker.length) : entry.filePath;
}

function joinRelativePath(sourceDir: string, target: string): string | undefined {
  const out: string[] = sourceDir ? sourceDir.split("/").filter(Boolean) : [];
  for (const raw of target.split("/")) {
    if (!raw || raw === ".") continue;
    if (raw === "..") {
      if (out.length === 0) return undefined;
      out.pop();
    } else out.push(raw);
  }
  return out.join("/");
}

function dedupeNodes(nodes: EntryNode[]): EntryNode[] {
  const seen = new Set<string>();
  const out: EntryNode[] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}
