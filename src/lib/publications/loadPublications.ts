import fs from "node:fs/promises";

import yaml from "js-yaml";

import { publicationsConfig } from "../../config/publications";
import { cleanLatex } from "./latex";
import { splitBibtexNames, surname } from "./names";
import { cleanValue, parseRawBibtex, resolvePreview, type RawEntry } from "./parseBibtex";
import { UNDATED_YEAR, type Publication } from "./types";

/**
 * The site's publications, from a YAML list (`src/data/publications.yaml`).
 *
 * Each entry has two kinds of data, kept apart on purpose:
 *
 *   - display fields (`title`, `authors`, `venue`, `award`, `links`, …), plain
 *     text the site shows as written: no LaTeX, names in reading order;
 *   - `bibtex`, the citation readers copy, kept verbatim. It is never
 *     rewritten, so it can be the venue's official BibTeX.
 *
 * The two can drift apart, so `bibtex` is checked against the display fields:
 * its key must be the entry's `id`, and its title, year and surnames must
 * match. It is also checked as a citation: fields its entry type requires,
 * a valid arXiv `primaryClass`, and no award text ("spotlight", "oral")
 * inside a venue field, where it would be cited.
 */

export const PUBLICATION_LINK_KEYS = [
  "pdf",
  "arxiv",
  "html",
  "code",
  "blog",
  "slides",
  "poster",
  "video",
  "website",
  "publisher",
  "doi",
  "url"
] as const;
export type PublicationLinkKey = (typeof PUBLICATION_LINK_KEYS)[number];

const STRING_FIELDS = [
  "id",
  "title",
  "venue",
  "award",
  "abbr",
  "preview",
  "tldr",
  "abstract",
  "publisher_label",
  "bibtex"
] as const;
const KNOWN_FIELDS = new Set<string>([...STRING_FIELDS, "authors", "year", "selected", "links"]);

export type PublicationIssue = {
  /** `id` of the entry, or its position in the list when it has none. */
  entry: string;
  message: string;
  /** The entry could not be read and is left off the site. */
  skipped: boolean;
};

/**
 * Required fields by BibTeX entry type, beyond author, title and year. The
 * types BibTeX knows but this list omits are accepted without extra checks.
 */
const REQUIRED_BY_TYPE: Record<string, string[]> = {
  article: ["journal"],
  inproceedings: ["booktitle"],
  conference: ["booktitle"],
  incollection: ["booktitle", "publisher"],
  book: ["publisher"],
  phdthesis: ["school"],
  mastersthesis: ["school"],
  techreport: ["institution"]
};
const KNOWN_TYPES = new Set([
  ...Object.keys(REQUIRED_BY_TYPE),
  "misc",
  "inbook",
  "proceedings",
  "unpublished",
  "manual",
  "booklet",
  "online"
]);

/** arXiv categories: `cs.LG`, `stat.ML`, `math.ST`, `hep-th`, `q-bio.NC`, `astro-ph.CO`. */
const ARXIV_CATEGORY = /^[a-z]+(-[a-z]+)?(\.[A-Za-z]{2,})?$/;
/** Presentation or award text that belongs in `award`, not in what gets cited. */
const AWARD_TEXT = /\b(spotlight|oral|best\s+paper|award|outstanding\s+paper|honou?rable\s+mention)\b/i;

const cache = new Map<string, Promise<Publication[]>>();

/**
 * Publications for the site, keeping every entry that can be read.
 *
 * An entry that cannot be read (no title, a misspelled field) is skipped, and
 * a citation that disagrees with its entry is kept; both are reported as
 * build warnings rather than thrown, so one mistake doesn't take the site
 * down. `npm run validate` fails on the same problems, listing all of them.
 * Parsed once per build.
 */
export function loadPublications(source = publicationsConfig.source): Promise<Publication[]> {
  let publications = cache.get(source);
  if (!publications) {
    publications = fs.readFile(source, "utf8").then((text) => {
      const result = parsePublicationsYaml(text);
      for (const issue of result.issues) {
        const outcome = issue.skipped ? " This entry was skipped." : "";
        console.warn(`[publications] ${source} (${issue.entry}): ${issue.message}${outcome}`);
      }
      return result.publications;
    });
    cache.set(source, publications);
  }
  return publications;
}

export function parsePublicationsYaml(text: string): { publications: Publication[]; issues: PublicationIssue[] } {
  const parsed = yaml.load(text);
  if (parsed === undefined || parsed === null) return { publications: [], issues: [] };
  if (!Array.isArray(parsed)) {
    throw new Error("The publications file must be a YAML list, one item per publication.");
  }

  const publications: Publication[] = [];
  const issues: PublicationIssue[] = [];
  const seen = new Set<string>();
  parsed.forEach((item: unknown, index: number) => {
    const label = isRecord(item) && typeof item.id === "string" ? item.id : `item ${index + 1}`;
    const report = (message: string, skipped = false) => issues.push({ entry: label, message, skipped });
    const publication = toPublication(item, report);
    if (!publication) return;
    if (seen.has(publication.id)) {
      report(`Duplicate id "${publication.id}".`, true);
      return;
    }
    seen.add(publication.id);
    publications.push(publication);
  });
  return { publications, issues };
}

/**
 * The publication whose `links.blog` is one of `paths` — a page's own route
 * and its short URL — compared without a trailing slash.
 */
export function publicationForPage(
  publications: Publication[],
  paths: Array<string | undefined>
): Publication | undefined {
  const wanted = new Set(paths.filter(Boolean).map((p) => trimSlash(p!)));
  return publications.find((publication) => publication.blog && wanted.has(trimSlash(publication.blog)));
}

function toPublication(item: unknown, report: (message: string, skipped?: boolean) => void): Publication | undefined {
  if (!isRecord(item)) {
    report("Each publication must be a mapping of fields.", true);
    return undefined;
  }

  const unknown = Object.keys(item).filter((key) => !KNOWN_FIELDS.has(key));
  if (unknown.length > 0) {
    report(`Unknown field${unknown.length > 1 ? "s" : ""} ${unknown.map((key) => `"${key}"`).join(", ")}.`, true);
    return undefined;
  }
  for (const key of STRING_FIELDS) {
    if (item[key] !== undefined && typeof item[key] !== "string") {
      report(`"${key}" must be text.`, true);
      return undefined;
    }
  }
  const text = (key: (typeof STRING_FIELDS)[number]) => {
    const value = (item[key] as string | undefined)?.trim();
    return value ? value : undefined;
  };

  const id = text("id");
  const title = text("title");
  if (!id || !title) {
    report(`Every publication needs an "id" and a "title".`, true);
    return undefined;
  }
  const authors = item.authors;
  if (!Array.isArray(authors) || authors.length === 0 || !authors.every((name) => typeof name === "string" && name.trim())) {
    report(`"authors" must be a list of names, e.g. [Ada Lovelace, Charles Babbage].`, true);
    return undefined;
  }
  const year =
    item.year === undefined
      ? UNDATED_YEAR
      : typeof item.year === "number"
        ? String(item.year)
        : typeof item.year === "string"
          ? item.year.trim()
          : "";
  if (year !== UNDATED_YEAR && !/^\d{4}$/.test(year)) {
    report(`"year" must be a four-digit year, or left out for an undated entry.`, true);
    return undefined;
  }
  if (item.selected !== undefined && typeof item.selected !== "boolean") {
    report(`"selected" must be true or false.`, true);
    return undefined;
  }

  const links: Partial<Record<PublicationLinkKey, string>> = {};
  if (item.links !== undefined) {
    if (!isRecord(item.links)) {
      report(`"links" must be a mapping such as { arxiv: "2401.00001", code: https://… }.`, true);
      return undefined;
    }
    for (const [key, value] of Object.entries(item.links)) {
      if (!(PUBLICATION_LINK_KEYS as readonly string[]).includes(key)) {
        report(`Unknown link "${key}"; links can be ${PUBLICATION_LINK_KEYS.join(", ")}.`, true);
        return undefined;
      }
      if (typeof value !== "string" || !value.trim()) {
        report(`Link "${key}" must be text.`, true);
        return undefined;
      }
      links[key as PublicationLinkKey] = value.trim();
    }
  }

  const names = authors.map((name: string) => name.trim());
  const bibtex = (item.bibtex as string | undefined)?.trim() ?? "";
  const entry = bibtex ? checkBibtex(bibtex, { id, title, year, authors: names }, report) : undefined;
  const fields: Record<string, string> = Object.fromEntries(
    Object.entries(entry?.fields ?? {}).map(([key, value]) => [key, cleanValue(value)])
  );
  const publisherLabel = text("publisher_label");
  if (publisherLabel) fields.publisher_label = publisherLabel;

  return {
    id,
    type: entry?.type ?? "publication",
    title,
    author: names.join(", "),
    authors: names,
    year,
    venue: text("venue"),
    award: text("award"),
    abstract: text("abstract"),
    tldr: text("tldr"),
    abbr: text("abbr"),
    pdf: links.pdf,
    arxiv: links.arxiv,
    html: links.html,
    code: links.code,
    blog: links.blog,
    slides: links.slides,
    poster: links.poster,
    video: links.video,
    website: links.website,
    publisherPage: links.publisher,
    doi: links.doi,
    url: links.url,
    preview: resolvePreview(text("preview")),
    selected: item.selected === true,
    bibtexShow: Boolean(bibtex),
    bibtex,
    raw: bibtex,
    fields
  };
}

/**
 * Parse an entry's `bibtex` and report where it disagrees with the entry or
 * is not a correct citation. The entry is kept either way.
 */
function checkBibtex(
  bibtex: string,
  expected: { id: string; title: string; year: string; authors: string[] },
  report: (message: string) => void
): RawEntry | undefined {
  let entries: RawEntry[];
  try {
    entries = parseRawBibtex(bibtex);
  } catch (error) {
    report(`"bibtex" could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
  if (entries.length !== 1) {
    report(`"bibtex" must hold exactly one entry; it holds ${entries.length}.`);
    return entries[0];
  }

  const [entry] = entries;
  const fields = entry.fields;
  if (entry.key !== expected.id) {
    report(`The BibTeX key "${entry.key}" should be the entry's id, "${expected.id}".`);
  }
  if (!KNOWN_TYPES.has(entry.type)) report(`"@${entry.type}" is not a standard BibTeX entry type.`);
  for (const field of ["author", "title", "year", ...(REQUIRED_BY_TYPE[entry.type] ?? [])]) {
    if (!fields[field]?.trim()) report(`An @${entry.type} entry needs a "${field}" field.`);
  }

  if (fields.title && comparable(fields.title) !== comparable(expected.title)) {
    report(`The BibTeX title differs from "title".`);
  }
  if (fields.year && expected.year !== UNDATED_YEAR && fields.year.trim() !== expected.year) {
    report(`The BibTeX year (${fields.year.trim()}) differs from "year" (${expected.year}).`);
  }
  if (fields.author) {
    const surnames = splitBibtexNames(fields.author).map(surname);
    if (surnames.length !== expected.authors.length) {
      report(`The BibTeX lists ${surnames.length} authors; "authors" lists ${expected.authors.length}.`);
    } else {
      surnames.forEach((last, index) => {
        const name = ` ${comparableName(expected.authors[index])} `;
        if (!name.includes(` ${comparableName(last)} `)) {
          report(`BibTeX author ${index + 1}, surname "${last}", does not match "${expected.authors[index]}".`);
        }
      });
    }
  }

  const primaryClass = fields.primaryclass?.trim();
  if (primaryClass !== undefined && !ARXIV_CATEGORY.test(primaryClass)) {
    report(`primaryClass "${primaryClass}" is not an arXiv category such as cs.LG or stat.ML.`);
  }
  for (const field of ["journal", "booktitle", "note", "howpublished"]) {
    const match = fields[field] && AWARD_TEXT.exec(fields[field]);
    if (match) report(`The BibTeX ${field} contains "${match[0]}"; put it in "award" instead.`);
  }
  return entry;
}

/** A title compared without case, LaTeX braces or punctuation. */
function comparable(value: string): string {
  return cleanLatex(value)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function comparableName(value: string): string {
  return comparable(value.replace(/,?\s+(jr|sr|ii|iii|iv)\.?$/i, ""));
}

/** A site path compared with one leading slash and no trailing slash. */
function trimSlash(value: string): string {
  const path = /^[a-z]+:/i.test(value) || value.startsWith("/") ? value : `/${value}`;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
