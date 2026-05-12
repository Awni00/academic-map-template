import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { normalizeKey, normalizeSlug } from "../graph/resolveLinks";
import { writingEntryUrl } from "../routes/paths";

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

type FileResolver = (target: string) => string | undefined;

const resolverCache = new Map<string, FileResolver>();

export function remarkWikilinks(options: RemarkWikilinksOptions) {
  const cacheKey = `${options.contentDir}:${options.writingRoute}`;
  const resolve = resolverCache.get(cacheKey) ?? createFileResolver(options);
  resolverCache.set(cacheKey, resolve);

  return function transform(tree: Node) {
    replaceWikilinkText(tree, resolve, options.writingRoute);
  };
}

function createFileResolver(options: RemarkWikilinksOptions): FileResolver {
  const root = path.resolve(process.cwd(), options.contentDir);
  const bySlug = new Map<string, string>();
  const byExactAlias = new Map<string, string>();
  const byNormalizedTitle = new Map<string, string>();
  const byNormalizedAlias = new Map<string, string>();

  if (!fs.existsSync(root)) return () => undefined;

  for (const file of listMdxFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    const parsed = matter(source);
    const relative = path.relative(root, file);
    const fileBase = path.basename(relative, path.extname(relative));
    const slug = normalizeSlug(String(parsed.data.slug ?? fileBase));
    bySlug.set(slug, slug);
    bySlug.set(relative.replace(/\.[^.]+$/, ""), slug);
    if (typeof parsed.data.title === "string") byNormalizedTitle.set(normalizeKey(parsed.data.title), slug);
    if (Array.isArray(parsed.data.aliases)) {
      for (const alias of parsed.data.aliases) {
        if (typeof alias !== "string") continue;
        byExactAlias.set(alias, slug);
        byNormalizedAlias.set(normalizeKey(alias), slug);
      }
    }
  }

  return (target) => {
    const clean = target.trim();
    const normalized = normalizeKey(clean);
    return (
      bySlug.get(clean) ??
      byExactAlias.get(clean) ??
      bySlug.get(normalized) ??
      byNormalizedTitle.get(normalized) ??
      byNormalizedAlias.get(normalized)
    );
  };
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

function replaceWikilinkText(node: Node, resolve: FileResolver, writingRoute: string): void {
  if (!node.children) return;
  if (["link", "linkReference", "code", "inlineCode", "html"].includes(node.type)) return;

  const nextChildren: Node[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...splitWikilinkText(child.value, resolve, writingRoute));
    } else {
      replaceWikilinkText(child, resolve, writingRoute);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

function splitWikilinkText(value: string, resolve: FileResolver, writingRoute: string): Node[] {
  const nodes: Node[] = [];
  const pattern = /\[\[([^\]\n]+)\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push({ type: "text", value: value.slice(cursor, match.index) });
    const [targetPart, labelPart] = match[1].split("|");
    const target = targetPart.trim();
    const label = (labelPart ?? targetPart).trim();
    const resolvedSlug = resolve(target);
    if (resolvedSlug) {
      nodes.push({
        type: "link",
        url: writingEntryUrl(resolvedSlug, writingRoute),
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
