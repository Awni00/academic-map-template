import fs from "node:fs/promises";

import { publicationsConfig } from "../../config/publications";
import type { Publication } from "./types";

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

export async function loadPublications(source = publicationsConfig.source): Promise<Publication[]> {
  const bibtex = await fs.readFile(source, "utf8");
  return parseBibtex(bibtex);
}

export function parseBibtex(input: string): Publication[] {
  return parseRawBibtex(input).map(normalizePublication);
}

export function parseRawBibtex(input: string): RawEntry[] {
  const entries: RawEntry[] = [];
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
    const openIndex = at + typeMatch[0].length - 1;
    const closeIndex = findClosing(input, openIndex);
    if (closeIndex === -1) {
      throw new Error(`Malformed BibTeX entry starting at character ${at}.`);
    }

    const raw = input.slice(at, closeIndex + 1);
    const body = input.slice(openIndex + 1, closeIndex);
    const comma = body.indexOf(",");
    if (comma === -1) throw new Error(`BibTeX entry "${type}" is missing a key.`);
    const key = body.slice(0, comma).trim();
    const fields = parseFields(body.slice(comma + 1));
    entries.push({ type, key, fields, raw });
    cursor = closeIndex + 1;
  }

  return entries;
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
    year: fields.year ?? "n.d.",
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

function parseFields(input: string): Record<string, string> {
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
    if (input[cursor] !== "=") throw new Error(`BibTeX field "${name}" is missing "=".`);
    cursor += 1;
    cursor = skipWhitespace(input, cursor);

    const parsed = readValue(input, cursor);
    fields[name] = parsed.value;
    cursor = parsed.end;
  }

  return fields;
}

function readValue(input: string, start: number): { value: string; end: number } {
  const first = input[start];
  if (first === "{") {
    const close = findClosing(input, start);
    if (close === -1) throw new Error("Unclosed braced BibTeX value.");
    return { value: input.slice(start + 1, close), end: close + 1 };
  }
  if (first === "\"") {
    let cursor = start + 1;
    let value = "";
    while (cursor < input.length) {
      const char = input[cursor];
      if (char === "\"" && input[cursor - 1] !== "\\") return { value, end: cursor + 1 };
      value += char;
      cursor += 1;
    }
    throw new Error("Unclosed quoted BibTeX value.");
  }

  const match = /^[^,\n\r]+/.exec(input.slice(start));
  return { value: match?.[0].trim() ?? "", end: start + (match?.[0].length ?? 0) };
}

function findClosing(input: string, openIndex: number): number {
  const open = input[openIndex];
  const close = open === "{" ? "}" : ")";
  let depth = 0;
  for (let index = openIndex; index < input.length; index += 1) {
    const char = input[index];
    if (char === open && input[index - 1] !== "\\") depth += 1;
    if (char === close && input[index - 1] !== "\\") {
      depth -= 1;
      if (depth === 0) return index;
    }
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
