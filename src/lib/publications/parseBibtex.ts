import fs from "node:fs/promises";

import { publicationsConfig } from "../../config/publications";
import { UNDATED_YEAR, type Publication } from "./types";

type RawEntry = {
  type: string;
  key: string;
  fields: Record<string, string>;
  raw: string;
};

const BIBTEX_FIELD_ORDER = [
  "author",
  "editor",
  "title",
  "booktitle",
  "journal",
  "publisher",
  "school",
  "institution",
  "organization",
  "year",
  "month",
  "volume",
  "number",
  "series",
  "pages",
  "chapter",
  "edition",
  "type",
  "address",
  "doi",
  "url",
  "isbn",
  "issn",
  "howpublished",
  "note",
  "eprint",
  "archiveprefix",
  "primaryclass"
] as const;

export type BibtexIssue = {
  /** 1-based line in the source where the offending entry starts. */
  line: number;
  message: string;
};

/**
 * Publications for the site, keeping every entry that parses.
 *
 * A malformed entry is skipped and reported as a build warning rather than
 * thrown: the homepage and /publications both call this at build time, and one
 * bad line in a bibliography should not take the whole site down with it.
 * `npm run validate` still fails on the same problems, listing all of them.
 */
export async function loadPublications(source = publicationsConfig.source): Promise<Publication[]> {
  const bibtex = await fs.readFile(source, "utf8");
  const { publications, issues } = parseBibtexWithIssues(bibtex);
  for (const issue of issues) {
    console.warn(`[publications] ${source}:${issue.line}: ${issue.message} This entry was skipped.`);
  }
  return publications;
}

/** Strict parse: throws on the first problem. */
export function parseBibtex(input: string): Publication[] {
  const { publications, issues } = parseBibtexWithIssues(input);
  if (issues.length > 0) throw new Error(`Line ${issues[0].line}: ${issues[0].message}`);
  return publications;
}

/** Parse everything that can be parsed, and report what could not. */
export function parseBibtexWithIssues(input: string): { publications: Publication[]; issues: BibtexIssue[] } {
  const { entries, issues } = scanBibtex(input);
  return { publications: entries.map(normalizePublication), issues };
}

export function parseRawBibtex(input: string): RawEntry[] {
  const { entries, issues } = scanBibtex(input);
  if (issues.length > 0) throw new Error(`Line ${issues[0].line}: ${issues[0].message}`);
  return entries;
}

/**
 * Walk a .bib file entry by entry.
 *
 * Three block types are not publications and are handled as BibTeX does:
 * `@string` defines an abbreviation later fields may use, and `@comment` and
 * `@preamble` are skipped. Reference managers write all three — JabRef ends
 * every file with an `@comment` — so treating them as entries without a key
 * rejected ordinary bibliographies.
 *
 * Text between entries is a comment in BibTeX and is ignored.
 */
function scanBibtex(input: string): { entries: RawEntry[]; issues: BibtexIssue[] } {
  const entries: RawEntry[] = [];
  const issues: BibtexIssue[] = [];
  const macros = new Map<string, string>();
  let cursor = 0;

  while (cursor < input.length) {
    const at = input.indexOf("@", cursor);
    if (at === -1) break;
    const typeMatch = /^@([A-Za-z]+)\s*[{(]/.exec(input.slice(at));
    if (!typeMatch) {
      cursor = at + 1;
      continue;
    }

    const type = typeMatch[1].toLowerCase();
    const line = lineAt(input, at);
    const openIndex = at + typeMatch[0].length - 1;
    const closeIndex = findClosing(input, openIndex);
    if (closeIndex === -1) {
      issues.push({ line, message: `BibTeX @${type} is never closed.` });
      // Everything after an unclosed entry would otherwise be swallowed by it.
      // Resume at the next entry that starts a line, so one missing brace
      // loses one entry instead of the rest of the file.
      const next = /\n[ \t]*@/g;
      next.lastIndex = at + 1;
      const resume = next.exec(input);
      cursor = resume ? resume.index + 1 : input.length;
      continue;
    }
    cursor = closeIndex + 1;

    if (type === "comment" || type === "preamble") continue;

    const raw = input.slice(at, closeIndex + 1);
    const body = input.slice(openIndex + 1, closeIndex);

    if (type === "string") {
      try {
        for (const [name, value] of Object.entries(parseFields(body, macros))) {
          macros.set(name, value);
        }
      } catch (error) {
        issues.push({ line, message: `BibTeX @string: ${messageOf(error)}` });
      }
      continue;
    }

    const comma = body.indexOf(",");
    if (comma === -1) {
      issues.push({ line, message: `BibTeX @${type} entry is missing a citation key.` });
      continue;
    }
    const key = body.slice(0, comma).trim();
    try {
      entries.push({ type, key, fields: parseFields(body.slice(comma + 1), macros), raw });
    } catch (error) {
      issues.push({ line, message: `BibTeX entry "${key}": ${messageOf(error)}` });
    }
  }

  return { entries, issues };
}

function lineAt(input: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (input[index] === "\n") line += 1;
  return line;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizePublication(entry: RawEntry): Publication {
  const fields = Object.fromEntries(
    Object.entries(entry.fields).map(([key, value]) => [key.toLowerCase(), cleanValue(value)])
  );
  const venue = fields.journal ?? fields.booktitle ?? fields.publisher;
  const author = fields.author ?? "";
  const authors = author.split(/\s+and\s+/i).map((name) => name.trim()).filter(Boolean);
  return {
    id: entry.key,
    type: entry.type,
    title: fields.title ?? entry.key,
    author,
    authors,
    year: fields.year ?? UNDATED_YEAR,
    venue,
    abstract: fields.abstract,
    abbr: fields.abbr,
    doi: fields.doi,
    url: fields.url,
    arxiv: fields.arxiv,
    html: fields.html,
    pdf: fields.pdf,
    code: fields.code,
    blog: fields.blog,
    slides: fields.slides,
    poster: fields.poster,
    video: fields.video,
    website: fields.website,
    preview: resolvePreview(fields.preview),
    selected: boolField(fields.selected),
    bibtexShow: boolField(fields[publicationsConfig.bibtex.showButtonField]),
    bibtex: formatBibtex(entry, fields),
    raw: entry.raw,
    fields
  };
}

function parseFields(input: string, macros: ReadonlyMap<string, string>): Record<string, string> {
  const fields: Record<string, string> = {};
  let cursor = 0;

  while (cursor < input.length) {
    cursor = skipWhitespaceAndCommas(input, cursor);
    if (cursor >= input.length) break;

    const nameMatch = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(input.slice(cursor));
    if (!nameMatch) break;
    const name = nameMatch[0].toLowerCase();
    cursor += name.length;
    cursor = skipWhitespace(input, cursor);
    if (input[cursor] !== "=") throw new Error(`field "${name}" is missing "=".`);
    cursor += 1;
    cursor = skipWhitespace(input, cursor);

    // A value may be several parts joined with `#`: `journal = pami # " (ext.)"`.
    let value = "";
    for (;;) {
      const part = readValue(input, cursor, macros);
      value += part.value;
      cursor = skipWhitespace(input, part.end);
      if (input[cursor] !== "#") break;
      cursor = skipWhitespace(input, cursor + 1);
    }
    fields[name] = value;
  }

  return fields;
}

function readValue(
  input: string,
  start: number,
  macros: ReadonlyMap<string, string>
): { value: string; end: number } {
  const first = input[start];
  if (first === "{") {
    const close = findClosing(input, start);
    if (close === -1) throw new Error("a braced value is never closed.");
    return { value: input.slice(start + 1, close), end: close + 1 };
  }
  if (first === "\"") {
    // A quote only ends the value outside braces: `"A {"}quoted{"} word"` is
    // one value in BibTeX, not the three-character value `A {`.
    let depth = 0;
    for (let cursor = start + 1; cursor < input.length; cursor += 1) {
      const char = input[cursor];
      if (input[cursor - 1] === "\\") continue;
      if (char === "{") depth += 1;
      else if (char === "}") depth = Math.max(0, depth - 1);
      else if (char === "\"" && depth === 0) {
        return { value: input.slice(start + 1, cursor), end: cursor + 1 };
      }
    }
    throw new Error("a quoted value is never closed.");
  }

  // A bare value is a number or the name of an @string abbreviation. Unknown
  // names are kept as written, which is how `month = jan` stays readable.
  const match = /^[^,#\n\r]+/.exec(input.slice(start));
  const bare = match?.[0].trim() ?? "";
  return {
    value: macros.get(bare.toLowerCase()) ?? bare,
    end: start + (match?.[0].length ?? 0)
  };
}

/**
 * Index of the delimiter closing the one at `openIndex`, or -1.
 *
 * Braces must balance everywhere inside an entry, as BibTeX requires. A
 * parenthesised entry, `@article( ... )`, may contain an unmatched parenthesis
 * inside a braced or quoted value — `title = {Results :)}` — so parentheses
 * only count outside those.
 */
function findClosing(input: string, openIndex: number): number {
  const open = input[openIndex];
  if (open === "{") {
    let depth = 0;
    for (let index = openIndex; index < input.length; index += 1) {
      const char = input[index];
      if (input[index - 1] === "\\") continue;
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  }

  let braces = 0;
  let quoted = false;
  for (let index = openIndex + 1; index < input.length; index += 1) {
    const char = input[index];
    if (input[index - 1] === "\\") continue;
    if (char === "{") braces += 1;
    else if (char === "}") braces = Math.max(0, braces - 1);
    else if (char === "\"" && braces === 0) quoted = !quoted;
    else if (char === ")" && braces === 0 && !quoted) return index;
  }
  return -1;
}

function skipWhitespace(input: string, start: number): number {
  let cursor = start;
  while (/\s/.test(input[cursor] ?? "")) cursor += 1;
  return cursor;
}

function skipWhitespaceAndCommas(input: string, start: number): number {
  let cursor = start;
  while (/[\s,]/.test(input[cursor] ?? "")) cursor += 1;
  return cursor;
}

function cleanValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function boolField(value: string | undefined): boolean {
  return ["true", "yes", "1"].includes((value ?? "").trim().toLowerCase());
}

function formatBibtex(entry: RawEntry, fields: Record<string, string>): string {
  const lines = BIBTEX_FIELD_ORDER.flatMap((field) => {
    const value = fields[field];
    return value ? [`  ${field} = {${value}}`] : [];
  });

  if (lines.length === 0) return `@${entry.type}{${entry.key}}`;

  return `@${entry.type}{${entry.key},\n${lines
    .map((line, index) => `${line}${index === lines.length - 1 ? "" : ","}`)
    .join("\n")}\n}`;
}

function resolvePreview(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value) || value.startsWith("/")) return value;
  return `${publicationsConfig.previews.basePath}/${value}`;
}
