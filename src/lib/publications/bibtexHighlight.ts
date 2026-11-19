/**
 * Splits a BibTeX record into coloured tokens, one line at a time, for the
 * BibTeX block (`BibtexBlock.astro`). It recognises the lines a formatted
 * record is made of:
 *
 *   @type{key,
 *     field = {value},
 *   }
 *
 * A field line's `lead` (indent, field name, `=` and opening delimiter) is
 * kept apart from its `body`, so the block can hold the lead on one line and
 * wrap only the value. Any line that fits none of these shapes (such as the
 * continuation of a value that spans several lines) becomes one plain token,
 * so nothing is lost: joining every token's text, with a newline between
 * lines, gives back the record unchanged.
 */

export type BibtexTokenKind =
  | "type"
  | "key"
  | "field"
  | "value"
  | "punct"
  | "plain";

export type BibtexToken = { kind: BibtexTokenKind; text: string };

export type BibtexLine = { lead: BibtexToken[]; body: BibtexToken[] };

const HEAD = /^(\s*)(@\w+)(\s*\{)([^,]*)(,?)(\s*)$/;
const FIELD = /^(\s*)([\w-]+)(\s*=\s*)(.*?)(,?)(\s*)$/;
const DELIMITED = /^([{"])(.*)([}"])$/s;
const CLOSE = /^(\s*)(\})(\s*)$/;

const token = (kind: BibtexTokenKind, text: string): BibtexToken => ({
  kind,
  text,
});
const nonEmpty = (tokens: BibtexToken[]) => tokens.filter((t) => t.text !== "");

function highlightLine(line: string): BibtexLine {
  let match = HEAD.exec(line);
  if (match) {
    const [, indent, type, open, key, comma, trail] = match;
    return {
      lead: [],
      body: nonEmpty([
        token("plain", indent),
        token("type", type),
        token("punct", open),
        token("key", key),
        token("punct", comma),
        token("plain", trail),
      ]),
    };
  }

  match = FIELD.exec(line);
  if (match) {
    const [, indent, name, equals, value, comma, trail] = match;
    const delimited = DELIMITED.exec(value);
    const [open, inner, close] = delimited
      ? delimited.slice(1)
      : ["", value, ""];
    return {
      lead: nonEmpty([
        token("plain", indent),
        token("field", name),
        token("punct", equals),
        token("punct", open),
      ]),
      body: nonEmpty([
        token("value", inner),
        token("punct", close),
        token("punct", comma),
        token("plain", trail),
      ]),
    };
  }

  match = CLOSE.exec(line);
  if (match) {
    const [, indent, close, trail] = match;
    return {
      lead: [],
      body: nonEmpty([
        token("plain", indent),
        token("punct", close),
        token("plain", trail),
      ]),
    };
  }

  return { lead: [], body: nonEmpty([token("plain", line)]) };
}

export function highlightBibtex(source: string): BibtexLine[] {
  return source.split("\n").map(highlightLine);
}
