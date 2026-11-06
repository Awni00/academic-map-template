import fs from "node:fs/promises";

import { publicationsConfig } from "../../config/publications";
import { publicationLinks } from "../publications/formatPublication";
import { loadPublications } from "../publications/loadPublications";
import { arxivUrl } from "../publications/identifierUrls";
import { parseBibtexWithIssues } from "../publications/parseBibtex";
import { cleanLatex } from "../publications/latex";
import { UNDATED_YEAR, type Publication } from "../publications/types";

export { cleanLatex };

/** What a `<HoverNote cite="…">` shows for one bibliography entry. */
export type Citation = {
  key: string;
  title: string;
  authors: string;
  venue?: string;
  year?: string;
  link?: { label: string; href: string };
};

const bibliographies = new Map<string, Promise<Map<string, Publication>>>();

/**
 * Entries of one BibTeX file by key, parsed once per build. Malformed entries
 * are skipped with a warning, matching the publications page.
 */
export function loadBibliography(file: string): Promise<Map<string, Publication>> {
  let entries = bibliographies.get(file);
  if (!entries) {
    entries = fs.readFile(file, "utf8").then((bibtex) => {
      const { publications, issues } = parseBibtexWithIssues(bibtex);
      for (const issue of issues) {
        console.warn(`[citations] ${file}:${issue.line}: ${issue.message} This entry was skipped.`);
      }
      return new Map(publications.map((publication) => [publication.id, publication]));
    });
    bibliographies.set(file, entries);
  }
  return entries;
}

/**
 * Looks `key` up in the page's own bibliographies first, in order, then in the
 * site's publications by `id` — so a post can cite outside work and the
 * author's own papers without copying either.
 */
export async function resolveCitation(key: string, pageBibliographies: string[] = []): Promise<Citation> {
  for (const file of pageBibliographies) {
    const publication = (await loadBibliography(file)).get(key);
    if (publication) return formatCitation(publication);
  }
  const own = (await loadPublications()).find((publication) => publication.id === key);
  if (own) return formatCitation(own);
  const searched = [...pageBibliographies, publicationsConfig.source];
  throw new Error(`<HoverNote cite="${key}">: no entry with that key in ${searched.join(", ")}.`);
}

export function formatCitation(publication: Publication): Citation {
  const fields = publication.fields ?? {};
  const eprintArxiv =
    fields.eprint && /arxiv/i.test(fields.archiveprefix ?? fields.eprinttype ?? "") ? fields.eprint : undefined;
  const link =
    publicationLinks(publication)[0] ??
    (eprintArxiv ? { label: "arXiv", href: arxivUrl(eprintArxiv) } : undefined);

  return {
    key: publication.id,
    title: cleanLatex(publication.title),
    authors: formatCitationAuthors(publication.authors.map(cleanLatex)),
    venue: publication.venue ? cleanLatex(publication.venue) : undefined,
    year: publication.year === UNDATED_YEAR ? undefined : publication.year,
    link
  };
}

/** "Ashish Vaswani, Noam Shazeer, et al.": names in reading order, cut after `max`. */
export function formatCitationAuthors(authors: string[], max = 3): string {
  if (authors.length <= max) return authors.join(", ");
  return `${authors.slice(0, max - 1).join(", ")}, et al.`;
}
