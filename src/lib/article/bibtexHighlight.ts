/**
 * Splits a BibTeX record into coloured tokens for the entry footer's Cite
 * block. It works line by line on the shapes a single formatted record takes:
 *
 *   @type{key,
 *     field = {value},
 *   }
 *
 * Any line that does not fit one of these (such as the continuation of a
 * value that spans several lines) stays a plain token, so nothing is lost:
 * joining every token's text gives back the record unchanged.
 */

export type BibtexTokenKind = "type" | "key" | "field" | "value" | "punct" | "plain";

export type BibtexToken = { kind: BibtexTokenKind; text: string };

const HEAD = /^(\s*)(@\w+)(\s*\{)([^,]*)(,?)(\s*)$/;
const FIELD = /^(\s*)([\w-]+)(\s*=\s*)(.*?)(,?)(\s*)$/;
const DELIMITED = /^([{"])(.*)([}"])$/s;
const CLOSE = /^(\s*)(\})(\s*)$/;

function lineTokens(line: string): BibtexToken[] {
  let match = HEAD.exec(line);
  if (match) {
    const [, indent, type, open, key, comma, trail] = match;
    return [
      { kind: "plain", text: indent },
      { kind: "type", text: type },
      { kind: "punct", text: open },
      { kind: "key", text: key },
      { kind: "punct", text: comma },
      { kind: "plain", text: trail }
    ];
  }

  match = FIELD.exec(line);
  if (match) {
    const [, indent, name, equals, value, comma, trail] = match;
    const delimited = DELIMITED.exec(value);
    const valueTokens: BibtexToken[] = delimited
      ? [
          { kind: "punct", text: delimited[1] },
          { kind: "value", text: delimited[2] },
          { kind: "punct", text: delimited[3] }
        ]
      : [{ kind: "value", text: value }];
    return [
      { kind: "plain", text: indent },
      { kind: "field", text: name },
      { kind: "punct", text: equals },
      ...valueTokens,
      { kind: "punct", text: comma },
      { kind: "plain", text: trail }
    ];
  }

  match = CLOSE.exec(line);
  if (match) {
    const [, indent, close, trail] = match;
    return [
      { kind: "plain", text: indent },
      { kind: "punct", text: close },
      { kind: "plain", text: trail }
    ];
  }

  return [{ kind: "plain", text: line }];
}

export function highlightBibtex(source: string): BibtexToken[] {
  const tokens: BibtexToken[] = [];
  source.split("\n").forEach((line, index) => {
    if (index > 0) tokens.push({ kind: "plain", text: "\n" });
    tokens.push(...lineTokens(line));
  });
  return tokens.filter((token) => token.text !== "");
}
