import remarkParse from "remark-parse";
import { unified } from "unified";

/**
 * A one-line Markdown dialect for short strings such as news titles:
 * `*em*` / `_em_`, `**strong**`, `` `code` ``, `[text](url)` and `<url>`
 * autolinks, mixed with plain text. Everything else is literal text.
 *
 * Block constructs are switched off in the parser rather than stripped from
 * its output, so a title that happens to start like a list item ("1. Paper
 * accepted"), a heading ("# 1 on the leaderboard") or a quote stays the text
 * written. Raw HTML is switched off the same way and its `<` comes out
 * escaped; images and link reference definitions are off too.
 */
const DISABLED_CONSTRUCTS = [
  "blockQuote",
  "codeFenced",
  "codeIndented",
  "definition",
  "headingAtx",
  "htmlFlow",
  "htmlText",
  "labelStartImage",
  "list",
  "setextUnderline",
  "thematicBreak"
];

type Node = {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: Node[];
};

export type InlineMarkdown = {
  /** Escaped HTML, safe to inject as the content of an inline element. */
  html: string;
  /** Whether the source contains a link, which cannot sit inside another link. */
  hasLink: boolean;
};

/**
 * Allowed link targets: http(s), mailto, and anything without a scheme
 * (`/blog/post`, `#section`, `paper.pdf`). `javascript:`, `data:` and other
 * schemes are refused. The scheme is read the way a browser reads it, which
 * drops tabs and newlines anywhere and control characters at the start, so
 * `java\tscript:` is refused too.
 */
export function isSafeUrl(url: string): boolean {
  // eslint-disable-next-line no-control-regex
  const normalized = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000- ]+/, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
  return !scheme || ["http", "https", "mailto"].includes(scheme[1].toLowerCase());
}

export function renderInlineMarkdown(source: string): InlineMarkdown {
  const processor = unified().use(remarkParse);
  processor.data("micromarkExtensions", [{ disable: { null: DISABLED_CONSTRUCTS } }]);
  const tree = processor.parse(source) as Node;

  let hasLink = false;
  const render = (node: Node): string => {
    switch (node.type) {
      case "text":
        return escapeHtml(node.value ?? "");
      case "inlineCode":
        return `<code>${escapeHtml(node.value ?? "")}</code>`;
      case "emphasis":
        return `<em>${renderChildren(node)}</em>`;
      case "strong":
        return `<strong>${renderChildren(node)}</strong>`;
      case "link": {
        const url = node.url ?? "";
        if (!isSafeUrl(url)) {
          throw new Error(`Link target "${url}" is not allowed; use an http(s), mailto or site-relative URL.`);
        }
        hasLink = true;
        const title = node.title ? ` title="${escapeHtml(node.title)}"` : "";
        return `<a href="${escapeHtml(url)}"${title}>${renderChildren(node)}</a>`;
      }
      case "break":
        return " ";
      default:
        return renderChildren(node);
    }
  };
  const renderChildren = (node: Node): string => (node.children ?? []).map(render).join("");

  // With block constructs off, the root holds only paragraphs, more than one
  // only if the source has a blank line. They join into one inline run.
  const html = (tree.children ?? []).map(render).join(" ").replace(/\s*\n\s*/g, " ");
  return { html, hasLink };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
