/**
 * Whether a link opens in a new tab: it leaves the site (an absolute URL on
 * another host) or it is a PDF. A reader following a paper's arXiv, code or
 * slides keeps their place in the list; pages of the site itself, such as a
 * paper's blog post, open in place like any other navigation.
 */
export function opensInNewTab(href: string, siteUrl?: string): boolean {
  if (/\.pdf(?:[?#].*)?$/i.test(href)) return true;
  if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)) return false;
  if (!siteUrl) return true;
  try {
    return new URL(href, siteUrl).host !== new URL(siteUrl).host;
  } catch {
    return true;
  }
}

/** Attributes to spread on an `<a>`: a new tab without handing it `window.opener`. */
export function newTabAttrs(href: string, siteUrl?: string): { target?: string; rel?: string } {
  return opensInNewTab(href, siteUrl) ? { target: "_blank", rel: "noopener" } : {};
}
