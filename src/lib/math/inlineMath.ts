import katex from "katex";

import type { MathMacros } from "./macros";

/**
 * Render a plain-text string that may hold inline TeX — `$…$`, `$$…$$` or
 * `\(…\)` — to HTML, for text that never passes through the Markdown
 * pipeline: BibTeX abstracts, chiefly.
 *
 * Everything outside the math is HTML-escaped, so the result is safe for
 * `set:html` whatever the source contains. `\$` is a literal dollar, and a
 * delimiter with no partner is left as the text it was rather than swallowing
 * the rest of the string — an abstract that mentions "$5" should read "$5".
 * Math is always set inline: an abstract is one paragraph, and a display block
 * would break it in two.
 */
export function renderInlineMath(text: string, macros: MathMacros = {}): string {
  let html = "";
  let prose = "";
  let index = 0;

  const flushProse = () => {
    html += escapeHtml(prose);
    prose = "";
  };

  while (index < text.length) {
    const rest = text.slice(index);

    if (rest.startsWith("\\$")) {
      prose += "$";
      index += 2;
      continue;
    }

    const math = rest.startsWith("\\(")
      ? closingFrom(text, index, "\\(", "\\)")
      : rest.startsWith("$$")
        ? closingFrom(text, index, "$$", "$$")
        : rest.startsWith("$")
          ? closingFrom(text, index, "$", "$")
          : null;

    if (math) {
      flushProse();
      html += katex.renderToString(math.source, {
        macros: { ...macros },
        throwOnError: false,
        displayMode: false
      });
      index = math.end;
      continue;
    }

    prose += text[index];
    index += 1;
  }

  flushProse();
  return html;
}

/** The math between `open` at `start` and its unescaped `close`, if any. */
function closingFrom(
  text: string,
  start: number,
  open: string,
  close: string
): { source: string; end: number } | null {
  let cursor = start + open.length;
  while (cursor < text.length) {
    const found = text.indexOf(close, cursor);
    if (found === -1) return null;
    if (text[found - 1] === "\\" && close !== "\\)") {
      cursor = found + 1;
      continue;
    }
    const source = text.slice(start + open.length, found);
    if (source.trim() === "") return null;
    // Pandoc's rule for a single `$`: no space just inside either delimiter,
    // and no digit straight after the closer. It is what keeps "costs $5 and
    // $10" prose rather than math.
    if (open === "$") {
      if (/^\s|\s$/.test(source) || /\d/.test(text[found + 1] ?? "")) return null;
    }
    return { source, end: found + close.length };
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
