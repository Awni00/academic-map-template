import { cleanLatex } from "./latex";

/**
 * BibTeX author lists: `Altabaa, Awni and Webb, Taylor W.` or
 * `Awni Altabaa and Taylor W. Webb`. Names are separated by `and` outside
 * braces, so `{Barnes and Noble, Inc.}` stays one name.
 */
export function splitBibtexNames(field: string): string[] {
  return splitTopLevel(field, /\s+and\s+/iy).map((name) => name.trim()).filter(Boolean);
}

/**
 * One BibTeX name in reading order, LaTeX decoded. Handles BibTeX's three
 * forms: "First von Last", "von Last, First" and "von Last, Jr, First".
 */
export function displayName(name: string): string {
  const parts = splitTopLevel(name, /\s*,\s*/y).map((part) => part.trim());
  const [last, second, third] = parts;
  const ordered =
    parts.length >= 3 ? `${third} ${last}, ${second}` : parts.length === 2 && second ? `${second} ${last}` : last;
  return cleanLatex(ordered);
}

/**
 * The surname (with any "von" part) of one BibTeX name, LaTeX decoded: the
 * text before the first comma, or else the last word. A braced group counts
 * as one word, so `{Barnes and Noble}` is its own surname.
 */
export function surname(name: string): string {
  const parts = splitTopLevel(name, /\s*,\s*/y);
  if (parts.length > 1) return cleanLatex(parts[0]);
  const words = splitTopLevel(name.trim(), /\s+/y);
  return cleanLatex(words.at(-1) ?? "");
}

/** Split on `separator` wherever it occurs outside braces. */
function splitTopLevel(value: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      separator.lastIndex = index;
      const match = separator.exec(value);
      if (match && match[0].length > 0) {
        parts.push(value.slice(start, index));
        start = index + match[0].length;
        index = start - 1;
      }
    }
  }
  parts.push(value.slice(start));
  return parts;
}
