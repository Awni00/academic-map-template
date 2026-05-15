import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import {
  canonicalizeWritingPath,
  createEntryResolver,
  entryToRecord
} from "../graph/resolveLinks";
import { writingEntryUrl } from "../routes/paths";
import type { ResolvedReference, WritingEntryLike } from "../graph/types";

type RemarkWikilinksOptions = {
  contentDir: string;
  writingRoute: string;
};

type Node = {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: Node[];
  data?: Record<string, unknown>;
};

type FileResolver = (target: string, sourcePath?: string) => ResolvedReference;
type VFileLike = {
  path?: string;
  history?: string[];
};

export function remarkWikilinks(options: RemarkWikilinksOptions) {
  return function transform(tree: Node, file: VFileLike) {
    const resolve = createFileResolver(options);
    const sourcePath = sourcePathFromFile(file, options.contentDir);
    replaceWikilinkText(tree, resolve, options.writingRoute, sourcePath);
  };
}

function createFileResolver(options: RemarkWikilinksOptions): FileResolver {
  const root = path.resolve(process.cwd(), options.contentDir);
  if (!fs.existsSync(root)) return (input) => ({ input, reason: "unresolved" });

  const entries: WritingEntryLike[] = listMdxFiles(root).map((file) => {
    const source = fs.readFileSync(file, "utf8");
    const parsed = matter(source);
    return {
      id: path.relative(root, file).replace(/\.[^.]+$/, ""),
      body: parsed.content,
      data: {
        title: parsed.data.title,
        type: parsed.data.type,
        aliases: parsed.data.aliases ?? [],
        date: parsed.data.date,
        updated: parsed.data.updated,
        summary: parsed.data.summary,
        tags: parsed.data.tags ?? [],
        links: parsed.data.links ?? [],
        draft: parsed.data.draft ?? false
      }
    } as WritingEntryLike;
  });
  const resolve = createEntryResolver(entries.map((entry) => entryToRecord(entry, options.writingRoute)));

  return (target, sourcePath) => resolve(target, sourcePath);
}

function listMdxFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listMdxFiles(fullPath));
    if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function replaceWikilinkText(node: Node, resolve: FileResolver, writingRoute: string, sourcePath?: string): void {
  if (!node.children) return;
  if (["link", "linkReference", "code", "inlineCode", "html"].includes(node.type)) return;

  const nextChildren: Node[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...splitWikilinkText(child.value, resolve, writingRoute, sourcePath));
    } else {
      replaceWikilinkText(child, resolve, writingRoute, sourcePath);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

function splitWikilinkText(value: string, resolve: FileResolver, writingRoute: string, sourcePath?: string): Node[] {
  const nodes: Node[] = [];
  const pattern = /\[\[([^\]\n]+)\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push({ type: "text", value: value.slice(cursor, match.index) });
    const [targetPart, labelPart] = match[1].split("|");
    const target = targetPart.trim();
    const label = (labelPart ?? targetPart).trim();
    const resolved = resolve(target, sourcePath);
    if (resolved.target) {
      nodes.push({
        type: "link",
        url: writingEntryUrl(resolved.target.path, writingRoute),
        title: null,
        children: [{ type: "text", value: label }]
      });
    } else {
      nodes.push({
        type: "html",
        value: `<span class="unresolved-wikilink">[[${escapeHtml(match[1])}]]</span>`
      });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) nodes.push({ type: "text", value: value.slice(cursor) });
  return nodes;
}

function sourcePathFromFile(file: VFileLike | undefined, contentDir: string): string | undefined {
  const filePath = file?.path ?? file?.history?.[0];
  if (!filePath) return undefined;
  const root = path.resolve(process.cwd(), contentDir);
  const absolute = path.resolve(filePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) return undefined;
  return canonicalizeWritingPath(path.relative(root, absolute));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
