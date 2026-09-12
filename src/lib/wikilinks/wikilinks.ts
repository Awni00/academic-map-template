import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified, type PluggableList } from "unified";

import type { WikilinkMatch } from "../graph/types";

/**
 * One definition of what a wikilink is, shared by the page renderer
 * (`remarkWikilinks`) and the graph (`buildGraph`, which also feeds
 * `npm run validate`).
 *
 * They used to disagree. The renderer walked the Markdown syntax tree and
 * never linked text inside code, math or an existing link; the graph ran a
 * regex over the raw file. So `[[hub-1]]` shown in a code sample drew an edge
 * on the map that no link on the page produced, and `$x \in [[1, n]]$` raised
 * an "unresolved wikilink" warning for ordinary interval notation. Both now
 * parse with the same syntax plugins and walk the tree with the same rule.
 */

/**
 * The remark plugins that change what Markdown *parses* as, as opposed to
 * plugins that transform the tree afterwards. astro.config.ts builds its
 * pipeline from this list, so adding a syntax extension there adds it here.
 */
export const markdownSyntaxPlugins: PluggableList = [remarkGfm, remarkMath];

type Node = {
  type: string;
  value?: string;
  children?: Node[];
};

/**
 * Nodes whose text is never a wikilink. Code, inline code, math, MDX
 * expressions and raw HTML carry a `value` rather than text children, so the
 * walk below never looks inside them; links are listed because their label is
 * ordinary text that must not become a link inside a link.
 */
const OPAQUE_NODE_TYPES = new Set(["link", "linkReference", "code", "inlineCode", "html"]);

/** Matches one `[[target]]` or `[[target|label]]`. Global: create per use. */
export function wikilinkPattern(): RegExp {
  return /\[\[([^\]\n]+)\]\]/g;
}

/** Split the inside of `[[...]]` into its target and display label. */
export function splitWikilink(inner: string): { target: string; label: string } {
  const [targetPart, labelPart] = inner.split("|");
  return { target: targetPart.trim(), label: (labelPart ?? targetPart).trim() };
}

/**
 * Visit every text node a wikilink may appear in, replacing each with the
 * nodes `replace` returns. The renderer swaps in links; extraction returns the
 * node unchanged and only records what it saw.
 */
export function transformWikilinkText<TNode extends Node>(
  node: TNode,
  replace: (value: string) => TNode[]
): void {
  if (!node.children || OPAQUE_NODE_TYPES.has(node.type)) return;

  const nextChildren: Node[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...replace(child.value));
    } else {
      transformWikilinkText(child as TNode, replace);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

const markdownParser = unified()
  .use(remarkParse)
  .use(markdownSyntaxPlugins)
  .freeze();
const mdxParser = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(markdownSyntaxPlugins)
  .freeze();

// Every page build calls buildGraph over every entry, so the same bodies are
// parsed once per page. Keyed on the text itself, a cached result can never
// be stale: editing an entry produces a new key.
const extracted = new Map<string, WikilinkMatch[]>();

/**
 * The wikilinks in an entry body that will actually render as links.
 *
 * `mdx` should follow the file: `.md` content is parsed as plain Markdown,
 * where `<` and `{` are ordinary characters, and everything else as MDX.
 * Throws if the body does not parse, which Astro's build would also do.
 */
export function extractWikilinks(body: string, options: { mdx?: boolean } = {}): WikilinkMatch[] {
  const mdx = options.mdx ?? true;
  const key = `${mdx ? "mdx" : "md"}\0${body}`;
  const cached = extracted.get(key);
  if (cached) return cached;

  const tree = (mdx ? mdxParser : markdownParser).parse(body) as Node;
  const matches: WikilinkMatch[] = [];
  transformWikilinkText(tree, (value) => {
    for (const match of value.matchAll(wikilinkPattern())) {
      const { target, label } = splitWikilink(match[1]);
      if (target) matches.push({ raw: match[0], target, label });
    }
    return [{ type: "text", value }];
  });

  extracted.set(key, matches);
  return matches;
}

/** Whether an entry's source file is MDX, judged by its path when it has one. */
export function isMdxPath(filePath: string | undefined): boolean {
  return !filePath?.toLowerCase().endsWith(".md");
}
