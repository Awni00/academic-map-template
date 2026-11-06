import { publicationLinks, sameTarget, venueAcronym, type PublicationLinkKind } from "./formatPublication";
import { arxivUrl, doiUrl, externalLinkHref } from "./identifierUrls";
import type { Publication } from "./types";

/**
 * A paper page's venue, award and link chips.
 *
 * When a publication's `links.blog` is the page, these come from that
 * publication, so the page and the publications list cannot drift apart. The
 * page's own frontmatter (`venue`, `award`, `external`) is for pages with no
 * publication, and fills only what the publication leaves out; where the
 * publication has a value, a frontmatter value is ignored, and
 * `pageMetaIssues` reports it.
 */

/** Frontmatter `external` keys, and the publication link each one stands for. */
export const EXTERNAL_LINK_KINDS = {
  paper: "pdf",
  arxiv: "arxiv",
  doi: "doi",
  code: "code",
  slides: "slides",
  poster: "poster",
  website: "website",
  publisher_page: "publisher",
  video: "video"
} as const satisfies Record<string, PublicationLinkKind>;
export type ExternalLinkKey = keyof typeof EXTERNAL_LINK_KINDS;

export type PageFrontmatter = {
  venue?: string;
  award?: string;
  external?: Partial<Record<string, string | undefined>>;
};

export type PageLink = { kind: PublicationLinkKind; label: string; href: string };

export type PageMeta = { venue?: string; award?: string; links: PageLink[] };

export type PageMetaIssue = { severity: "error" | "warning"; message: string };

const FRONTMATTER_LABELS: Record<ExternalLinkKey, string> = {
  paper: "Paper",
  arxiv: "arXiv",
  doi: "DOI",
  code: "Code",
  slides: "Slides",
  poster: "Poster",
  website: "Website",
  publisher_page: "Published",
  video: "Video"
};

export function pageMeta(publication: Publication | undefined, data: PageFrontmatter): PageMeta {
  const venue = publication?.venue ?? clean(data.venue);
  const award = publication?.award ?? clean(data.award);

  // The publication's links in the publications list's order, less the link
  // back to this page, then any frontmatter links it doesn't have.
  const links: PageLink[] = publication
    ? publicationLinks(publication)
        .filter((link) => link.kind !== "blog")
        .map(({ kind, label, href }) => ({ kind, label, href }))
    : [];
  for (const [key, value] of frontmatterLinks(data)) {
    const kind = EXTERNAL_LINK_KINDS[key];
    if (publication && publicationHref(publication, kind)) continue;
    const label = kind === "publisher" ? (venueAcronym(venue) ?? FRONTMATTER_LABELS[key]) : FRONTMATTER_LABELS[key];
    links.push({ kind, label, href: externalLinkHref(key, value) });
  }
  return { venue, award, links };
}

/**
 * Frontmatter that a page's publication makes redundant or contradicts
 * (errors: the page shows the publication's value, so it is dead text), and
 * frontmatter the publication lacks (warnings: the page shows it, but the
 * publications list does not).
 */
export function pageMetaIssues(publication: Publication, data: PageFrontmatter): PageMetaIssue[] {
  const issues: PageMetaIssue[] = [];
  const of = `publication "${publication.id}"`;
  const compare = (field: string, page: string | undefined, published: string | undefined, same: boolean) => {
    if (page === undefined) return;
    if (published === undefined) {
      issues.push({
        severity: "warning",
        message: `frontmatter "${field}" is shown on the page but ${of} has none, so the publications list leaves it out. Move it to the publication.`
      });
    } else if (same) {
      issues.push({
        severity: "error",
        message: `frontmatter "${field}" repeats ${of}, which the page already takes it from. Remove it.`
      });
    } else {
      issues.push({
        severity: "error",
        message: `frontmatter "${field}" (${page}) contradicts ${of} (${published}), which the page shows instead. Remove it, or correct the publication.`
      });
    }
  };

  const venue = clean(data.venue);
  compare("venue", venue, publication.venue, venue === publication.venue);
  const award = clean(data.award);
  compare("award", award, publication.award, award?.toLowerCase() === publication.award?.toLowerCase());
  for (const [key, value] of frontmatterLinks(data)) {
    const href = externalLinkHref(key, value);
    const published = publicationHref(publication, EXTERNAL_LINK_KINDS[key]);
    compare(`external.${key}`, href, published, published !== undefined && sameTarget(href, published));
  }
  return issues;
}

function frontmatterLinks(data: PageFrontmatter): Array<[ExternalLinkKey, string]> {
  return Object.entries(data.external ?? {}).flatMap(([key, value]) => {
    const href = clean(value);
    return href && key in EXTERNAL_LINK_KINDS ? [[key as ExternalLinkKey, href]] : [];
  });
}

/** The publication's link of one kind, as a full URL. */
function publicationHref(publication: Publication, kind: PublicationLinkKind): string | undefined {
  const value = kind === "publisher" ? publication.publisherPage : publication[kind];
  if (!value) return undefined;
  if (kind === "arxiv") return arxivUrl(value);
  if (kind === "doi") return doiUrl(value);
  return value;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : undefined;
  return trimmed ? trimmed : undefined;
}
