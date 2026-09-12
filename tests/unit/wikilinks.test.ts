import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { buildGraphIndex } from "../../src/lib/graph/buildGraph";
import type { WritingEntryLike } from "../../src/lib/graph/types";
import { remarkWikilinks } from "../../src/lib/wikilinks/remarkWikilinks";
import { extractWikilinks, markdownSyntaxPlugins } from "../../src/lib/wikilinks/wikilinks";

/** Prose wikilinks surrounded by every construct that must not produce one. */
const body = [
  "Prose links to [[hub-1]] and [[hub-2|Hub two]], and to [[no-such-entry]].",
  "",
  "```md",
  "Documenting the syntax: [[in-fenced-code]]",
  "```",
  "",
  "Inline `[[in-inline-code]]`, and interval notation $x \\in [[1, n]]$.",
  "",
  "$$",
  "[[in-display-math]]",
  "$$",
  "",
  '<Callout type="note">Component children are prose: [[hub-1]]</Callout>',
  "",
  "{/* [[in-mdx-comment]] */}",
  "",
  "[a label with [[inside-a-link]]](https://example.com)"
].join("\n");

type Node = { type: string; value?: string; url?: string; children?: Node[] };

/** What the page renderer turns into links, or into unresolved-wikilink spans. */
function renderedWikilinks(source: string): string[] {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(markdownSyntaxPlugins)
    .use(remarkWikilinks, { contentDir: "src/content/writing", writingRoute: "writing" });
  const tree = processor.runSync(processor.parse(source)) as Node;

  const found: string[] = [];
  const walk = (node: Node) => {
    if (node.type === "link" && node.url?.startsWith("/writing/")) {
      found.push(node.url.replace("/writing/", ""));
    }
    const unresolved = node.value?.match(/class="unresolved-wikilink">\[\[(.+?)\]\]/);
    if (node.type === "html" && unresolved) found.push(unresolved[1]);
    node.children?.forEach(walk);
  };
  walk(tree);
  return found;
}

describe("wikilinks", () => {
  it("extracts only the wikilinks that sit in prose", () => {
    expect(extractWikilinks(body).map((match) => match.target)).toEqual([
      "hub-1",
      "hub-2",
      "no-such-entry",
      "hub-1"
    ]);
  });

  // The graph and the renderer used to be separate implementations — a regex
  // over the file against a walk of the syntax tree — and they disagreed on
  // code, math and links. This fails if they ever drift apart again.
  it("finds exactly the wikilinks the page renderer links", () => {
    const extracted = extractWikilinks(body).map((match) => match.target);
    expect(renderedWikilinks(body)).toEqual(extracted);
  });

  it("keeps labels", () => {
    expect(extractWikilinks("See [[ml-theory|ML theory]].")).toEqual([
      { raw: "[[ml-theory|ML theory]]", target: "ml-theory", label: "ML theory" }
    ]);
  });

  it("follows the file's dialect, since MDX and Markdown read braces differently", () => {
    // In MDX `{...}` is a JavaScript expression, so nothing inside it renders as
    // text; in plain Markdown the same characters are prose.
    const source = "Braced: {[[hub-1]]}";
    expect(extractWikilinks(source, { mdx: true })).toEqual([]);
    expect(extractWikilinks(source, { mdx: false }).map((match) => match.target)).toEqual([
      "hub-1"
    ]);
  });
});

describe("graph edges from wikilinks", () => {
  const entry = (id: string, entryBody: string): WritingEntryLike => ({
    id,
    filePath: `src/content/writing/${id}.mdx`,
    body: entryBody,
    data: { title: id, type: "note" }
  });

  it("draws no edge and raises no warning for a wikilink shown in code", () => {
    const { index, warnings } = buildGraphIndex([
      entry("teaching/syntax", "Write links like this:\n\n```md\n[[teaching/target]]\n[[missing]]\n```\n"),
      entry("teaching/target", "Nothing here.")
    ]);
    expect(index.edges).toEqual([]);
    expect(warnings.filter((warning) => /wikilink|reference/.test(warning.type))).toEqual([]);
  });

  it("still draws the edge for the same wikilink in prose", () => {
    const { index } = buildGraphIndex([
      entry("teaching/syntax", "See [[teaching/target]]."),
      entry("teaching/target", "Nothing here.")
    ]);
    expect(index.edges).toContainEqual({ source: "teaching/syntax", target: "teaching/target" });
  });

  it("names the entry when its body cannot be parsed", () => {
    expect(() => buildGraphIndex([entry("teaching/broken", "An unclosed <Callout")])).toThrow(
      /teaching\/broken/
    );
  });
});
