import { canonicalizeWritingPath } from "../graph/resolveLinks";
import { normalizeRoute, pageUrlFromId, rssRoute, writingEntryUrl, writingRoute } from "./paths";

/**
 * A writing entry's public URL is derived from its path on disk, so a hub two
 * levels deep is awkward to share and every reorganization breaks inbound
 * links. `shortUrl` frontmatter claims a second, stable path that redirects to
 * the entry's canonical URL.
 *
 * This module is deliberately free of `node:fs` so the content collection
 * schema can reuse the format pattern. Filesystem collection lives in
 * `shortLinksSource.ts`.
 */

/**
 * Lowercase, hyphen-separated path segments. The leading slash is optional so
 * `project-name` and `/project-name` both work, and multiple segments are
 * allowed so authors can namespace short links under a prefix like `/p/`
 * instead of filling the site root.
 */
export const SHORT_URL_PATTERN = /^\/?[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export const SHORT_URL_FORMAT_MESSAGE =
  'shortUrl must be a lowercase, hyphen-separated path such as "/project-name" or "/p/project-name"';

export type ShortLinkSource = {
  id: string;
  data: {
    shortUrl?: string;
  };
};

export type ShortLinkIssue = {
  entry: string;
  shortUrl: string;
  message: string;
};

export type ShortLinkResult = {
  /** Astro `redirects` map: short path -> canonical writing URL. */
  redirects: Record<string, string>;
  issues: ShortLinkIssue[];
};

export function normalizeShortUrl(value: string): string {
  return normalizeRoute(value.trim());
}

/**
 * Every path a short URL must not shadow, mapped to a human description of
 * what already owns it so collision messages can name the conflict.
 */
export function buildReservedRoutes(options: {
  writingIds?: string[];
  pageIds?: string[];
}): Map<string, string> {
  const reserved = new Map<string, string>();
  const claim = (route: string, owner: string): void => {
    if (!reserved.has(route)) reserved.set(route, owner);
  };

  claim("/", "the site root");
  claim(writingRoute(), "the writing browser");
  claim(rssRoute(), "the writing RSS feed");
  claim("/publications", "the publications page");

  for (const id of options.writingIds ?? []) {
    const entryPath = canonicalizeWritingPath(id);
    if (!entryPath) continue;
    claim(writingEntryUrl(entryPath), `writing entry "${id}"`);
  }

  for (const id of options.pageIds ?? []) {
    claim(pageUrlFromId(id), `page "${id}"`);
  }

  return reserved;
}

/**
 * Resolves declared short URLs into an Astro redirect map. Anything that
 * cannot be resolved is dropped and reported, so a single bad entry never
 * takes the rest of the site down with it — the caller decides whether an
 * issue is a warning (dev server) or an error (`npm run validate`).
 */
export function resolveShortLinks(
  sources: ShortLinkSource[],
  reserved: Map<string, string> = new Map()
): ShortLinkResult {
  const redirects: Record<string, string> = {};
  const issues: ShortLinkIssue[] = [];
  const claimedBy = new Map<string, string>();

  // Sort so that which of two conflicting entries wins does not depend on
  // filesystem read order.
  const ordered = [...sources].sort((a, b) => a.id.localeCompare(b.id));

  for (const source of ordered) {
    const raw = source.data.shortUrl;
    if (raw === undefined || raw.trim() === "") continue;

    if (!SHORT_URL_PATTERN.test(raw.trim())) {
      issues.push({
        entry: source.id,
        shortUrl: raw,
        message: `${source.id}: ${SHORT_URL_FORMAT_MESSAGE}. Received "${raw}".`
      });
      continue;
    }

    const shortUrl = normalizeShortUrl(raw);

    const owner = reserved.get(shortUrl);
    if (owner) {
      issues.push({
        entry: source.id,
        shortUrl,
        message: `${source.id}: shortUrl "${shortUrl}" collides with ${owner}.`
      });
      continue;
    }

    const previous = claimedBy.get(shortUrl);
    if (previous) {
      issues.push({
        entry: source.id,
        shortUrl,
        message: `${source.id}: shortUrl "${shortUrl}" is already claimed by "${previous}".`
      });
      continue;
    }

    const entryPath = canonicalizeWritingPath(source.id);
    if (!entryPath) {
      issues.push({
        entry: source.id,
        shortUrl,
        message: `${source.id}: shortUrl "${shortUrl}" has no entry to point at.`
      });
      continue;
    }

    claimedBy.set(shortUrl, source.id);
    redirects[shortUrl] = writingEntryUrl(entryPath);
  }

  return { redirects, issues };
}
