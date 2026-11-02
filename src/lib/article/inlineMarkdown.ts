import type { MathMacros } from "../math/macros";
import { escapeHtml, renderMath, splitInlineMath } from "../math/inlineMath";

/**
 * Render the inline Markdown an author writes in a string prop — a figure's
 * `caption="…"` — to HTML, so it reads the same as the caption slot, which
 * goes through MDX: `code`, *emphasis*, **strong**, [links](…) and $math$.
 *
 * Only inline syntax: a caption is one run of text, so there are no blocks,
 * headings or lists to find. Everything that is not markup is HTML-escaped,
 * so the result is safe for `set:html` whatever the prop holds, and a link
 * whose target is not a web, mail or relative URL stays plain text.
 *
 * Code spans are cut out first and math second, as in CommonMark, so a `$`
 * inside backticks is literal and an `_` inside math is not emphasis.
 */
export function renderInlineMarkdown(text: string, macros: MathMacros = {}): string {
  const held: string[] = [];
  const hold = (html: string) => `\uE000${held.push(html) - 1}\uE000`;

  let source = "";
  for (const piece of splitCodeSpans(text)) {
    if (piece.code !== undefined) {
      source += hold(`<code>${escapeHtml(piece.code)}</code>`);
      continue;
    }
    for (const part of splitInlineMath(piece.text)) {
      source += part.kind === "math" ? hold(renderMath(part.value, macros)) : holdEscapes(part.value, hold);
    }
  }

  let html = escapeHtml(source);
  html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) =>
    isSafeHref(href) ? `<a href="${href}">${label}</a>` : whole
  );
  html = html.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
  html = html.replace(/(^|[^*\w])\*(?=[^\s*])([^*]*?[^\s*])\*(?![*\w])/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_\w])_(?=[^\s_])([^_]*?[^\s_])_(?![_\w])/g, "$1<em>$2</em>");

  return html.replace(/\uE000(\d+)\uE000/g, (_, index: string) => held[Number(index)]);
}

type CodePiece = { text: string; code?: undefined } | { text?: undefined; code: string };

/** CommonMark code spans: a run of backticks closed by a run of the same length. */
function splitCodeSpans(text: string): CodePiece[] {
  const pieces: CodePiece[] = [];
  const span = /(`+)([\s\S]*?[^`])\1(?!`)/g;
  let last = 0;
  for (const match of text.matchAll(span)) {
    const start = match.index ?? 0;
    if (start > last) pieces.push({ text: text.slice(last, start) });
    let code = match[2];
    // One space either side is padding, so `` `a` `` can show its backticks.
    if (/^ .* $/s.test(code) && code.trim() !== "") code = code.slice(1, -1);
    pieces.push({ code });
    last = start + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

/** `\*`, `\_` and friends: the character itself, out of reach of the markup rules. */
function holdEscapes(text: string, hold: (html: string) => string): string {
  return text.replace(/\\([\\`*_[\]()])/g, (_, char: string) => hold(escapeHtml(char)));
}

/** Web and mail links, and anything with no scheme (relative paths, `#anchors`). */
function isSafeHref(href: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1].toLowerCase();
  return scheme === undefined || ["http", "https", "mailto"].includes(scheme);
}
