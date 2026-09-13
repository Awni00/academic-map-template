/**
 * DOIs and arXiv ids are usually written bare ("10.1000/xyz", "2401.00001"),
 * and a bare id used as an href resolves against the current page and 404s.
 * These turn an id into the resolver URL and leave a full URL untouched. Both
 * the publications list and writing entries' `external` links go through here.
 */

export function doiUrl(value: string): string {
  return value.startsWith("http") ? value : `https://doi.org/${value}`;
}

export function arxivUrl(value: string): string {
  return value.startsWith("http") ? value : `https://arxiv.org/abs/${value}`;
}

/** Href for one entry of a writing entry's `external` frontmatter. */
export function externalLinkHref(key: string, value: string): string {
  if (key === "doi") return doiUrl(value);
  if (key === "arxiv") return arxivUrl(value);
  return value;
}
