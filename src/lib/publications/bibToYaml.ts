import yaml from "js-yaml";

import { cleanLatex } from "./latex";
import { parseBibtex } from "./parseBibtex";

/** BibTeX fields that become `links:` in the YAML, by link name. */
const LINK_FIELDS: Record<string, string> = {
  pdf: "pdf",
  arxiv: "arxiv",
  html: "html",
  code: "code",
  blog: "blog",
  slides: "slides",
  poster: "poster",
  video: "video",
  website: "website",
  publisher: "publisher_page",
  doi: "doi",
  url: "url"
};

/**
 * A `publications.yaml` from an older `publications.bib`, for moving a site
 * over once (`npm run publications:from-bib`). Display fields are decoded to
 * plain text, names put in reading order, and the citation kept as `bibtex`,
 * written from the entry's standard fields only, as the old BibTeX button
 * showed it. Entries whose `bibtex_show` was off get no `bibtex`.
 *
 * Review the result: a venue written into `journal` stays there, and the
 * validator then asks for the right entry type and an `award` field.
 */
export function bibToYaml(bib: string): string {
  const items = parseBibtex(bib).map((publication) => {
    const fields = publication.fields;
    const links = Object.fromEntries(
      Object.entries(LINK_FIELDS)
        .filter(([, field]) => fields[field])
        .map(([name, field]) => [name, fields[field]])
    );
    const venue =
      publication.venue ?? (/^arxiv$/i.test(fields.archiveprefix ?? "") ? "arXiv preprint" : undefined);
    const item: Record<string, unknown> = {
      id: publication.id,
      title: cleanLatex(publication.title),
      authors: publication.authors,
      year: /^\d{4}$/.test(publication.year) ? Number(publication.year) : undefined,
      venue: venue ? cleanLatex(venue) : undefined,
      award: fields.award,
      selected: publication.selected || undefined,
      abbr: fields.abbr,
      preview: fields.preview,
      links: Object.keys(links).length > 0 ? links : undefined,
      publisher_label: fields.publisher_label,
      tldr: fields.tldr,
      abstract: fields.abstract,
      bibtex: publication.bibtexShow ? `${publication.bibtex}\n` : undefined
    };
    return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
  });
  return yaml.dump(items, { lineWidth: -1, noRefs: true });
}
