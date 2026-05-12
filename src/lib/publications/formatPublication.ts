import { publicationsConfig } from "../../config/publications";
import type { Publication, PublicationGroup } from "./types";

export function groupPublications(publications: Publication[]): PublicationGroup[] {
  const groups = new Map<string, Publication[]>();
  for (const publication of publications) {
    const key = publication.year;
    groups.set(key, [...(groups.get(key) ?? []), publication]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    const order: string = publicationsConfig.grouping.order;
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

export function publicationLinks(publication: Publication): Array<{ label: string; href: string }> {
  return [
    ["PDF", publication.pdf],
    ["arXiv", publication.arxiv ? arxivUrl(publication.arxiv) : undefined],
    ["HTML", publication.html],
    ["Code", publication.code],
    ["Blog", publication.blog],
    ["Slides", publication.slides],
    ["Poster", publication.poster],
    ["Video", publication.video],
    ["Website", publication.website],
    ["DOI", publication.doi ? doiUrl(publication.doi) : undefined],
    ["URL", publication.url]
  ]
    .filter(([, href]) => Boolean(href))
    .map(([label, href]) => ({ label: label!, href: href! }));
}

function arxivUrl(value: string): string {
  return value.startsWith("http") ? value : `https://arxiv.org/abs/${value}`;
}

function doiUrl(value: string): string {
  return value.startsWith("http") ? value : `https://doi.org/${value}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
