import { publicationsConfig } from "../../config/publications";
import { arxivUrl, doiUrl } from "./identifierUrls";
import { UNDATED_YEAR, type Publication, type PublicationGroup } from "./types";

export function groupPublications(
  publications: Publication[],
  order: "asc" | "desc" = publicationsConfig.grouping.order
): PublicationGroup[] {
  const groups = new Map<string, Publication[]>();
  for (const publication of publications) {
    const key = publication.year;
    groups.set(key, [...(groups.get(key) ?? []), publication]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    // Undated entries go last in either order. As a string, "n.d." sorts
    // after every year, so a descending list would open with them.
    if (a === UNDATED_YEAR || b === UNDATED_YEAR) {
      return Number(a === UNDATED_YEAR) - Number(b === UNDATED_YEAR);
    }
    if (order === "asc") return a.localeCompare(b);
    return b.localeCompare(a);
  });
  return sorted.map(([label, items]) => ({
    label,
    publications: items.sort((a, b) => a.title.localeCompare(b.title))
  }));
}

export function formatAuthors(authors: string[]): string {
  return authors.join(", ");
}

export function highlightedAuthorParts(author: string): Array<{ text: string; highlighted: boolean }> {
  const highlights = [...publicationsConfig.authorHighlight] as string[];
  if (highlights.length === 0) return [{ text: author, highlighted: false }];

  const pattern = new RegExp(`(${highlights.map(escapeRegExp).join("|")})`, "g");
  return author
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, highlighted: highlights.includes(part) }));
}

export type PublicationLinkKind =
  | "pdf"
  | "arxiv"
  | "html"
  | "code"
  | "blog"
  | "slides"
  | "poster"
  | "video"
  | "website"
  | "publisher"
  | "doi"
  | "url";

export type PublicationLink = { kind: PublicationLinkKind; label: string; href: string };

/**
 * The entry's link buttons, in display order. Two links are dropped when they
 * only repeat another one: `url`, whenever it points where another link
 * already does (BibTeX exporters fill it with the arXiv or publisher page),
 * and a `doi` that is arXiv's own DOI for the preprint (10.48550/arXiv.*)
 * when the arXiv link is shown.
 */
export function publicationLinks(publication: Publication): PublicationLink[] {
  const candidates: Array<[PublicationLinkKind, string, string | undefined]> = [
    ["pdf", "PDF", publication.pdf],
    ["arxiv", "arXiv", publication.arxiv ? arxivUrl(publication.arxiv) : undefined],
    ["html", "HTML", publication.html],
    ["code", "Code", publication.code],
    ["blog", "Blog", publication.blog],
    ["slides", "Slides", publication.slides],
    ["poster", "Poster", publication.poster],
    ["video", "Video", publication.video],
    ["website", "Website", publication.website],
    ["publisher", publisherLabel(publication), publication.publisherPage],
    ["doi", "DOI", publication.doi ? doiUrl(publication.doi) : undefined],
    ["url", "URL", publication.url]
  ];
  const links = candidates
    .filter((candidate): candidate is [PublicationLinkKind, string, string] => Boolean(candidate[2]))
    .map(([kind, label, href]) => ({ kind, label, href }));
  const hasArxiv = links.some((link) => link.kind === "arxiv");
  return links.filter((link) => {
    if (link.kind === "doi") return !(hasArxiv && isArxivDoi(link.href));
    if (link.kind === "url") {
      return !links.some((other) => other !== link && sameTarget(other.href, link.href));
    }
    return true;
  });
}

/**
 * Label for the `publisher_page` link: the entry's `publisher_label`, else the
 * venue's acronym — the last parenthesized group in the venue, as in
 * "Neural Information Processing Systems (NeurIPS)" — else "Published".
 */
export function publisherLabel(publication: Publication): string {
  const explicit = publication.fields?.publisher_label?.trim();
  if (explicit) return explicit;
  return venueAcronym(publication.venue) ?? "Published";
}

export function venueAcronym(venue: string | undefined): string | undefined {
  if (!venue) return undefined;
  const groups = [...venue.matchAll(/\(([^()]+)\)/g)].map((match) => match[1].trim());
  const last = groups.at(-1);
  // An acronym is short, has no spaces and at least one capital: "NeurIPS",
  // "TMLR", "ACC" — not "(extended version)" or "(2nd ed.)".
  return last && last.length <= 16 && !/\s/.test(last) && /[A-Z]/.test(last) ? last : undefined;
}

function isArxivDoi(href: string): boolean {
  return /(^|\/)10\.48550\/arxiv\./i.test(href);
}

/** Same page, ignoring scheme, `www.`, a trailing slash, and arXiv abs/pdf/version variants. */
export function sameTarget(a: string, b: string): boolean {
  return normalizeHref(a) === normalizeHref(b);
}

function normalizeHref(href: string): string {
  const arxiv = /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\/([^?#]+?)(?:v\d+)?(?:\.pdf)?\/?$/i.exec(href);
  if (arxiv) return `arxiv:${arxiv[1].toLowerCase()}`;
  const rest = href.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  const slash = rest.indexOf("/");
  // Hosts are case-insensitive; paths and queries (OpenReview ids) are not.
  return slash < 0 ? rest.toLowerCase() : rest.slice(0, slash).toLowerCase() + rest.slice(slash);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
