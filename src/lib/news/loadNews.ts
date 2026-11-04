import fs from "node:fs/promises";

import yaml from "js-yaml";

import { isSafeUrl, renderInlineMarkdown } from "./inlineMarkdown";

export type NewsItem = {
  date: string;
  /** The title as written, inline Markdown included. */
  title: string;
  /** The title rendered from its inline Markdown, HTML-escaped. */
  titleHtml: string;
  /** Links the whole entry. Not allowed when the title has its own link. */
  url?: string;
};

const DEFAULT_NEWS_PATH = "src/data/news.yaml";

/**
 * Homepage news items, newest first as written, capped at `maxItems`.
 *
 * - Disabled news never touches the file, so a site that turns news off can
 *   delete `news.yaml`.
 * - An empty file (or one holding only comments) is no news, not an error.
 * - YAML reads an unquoted `date: 2026-05-01` as a Date, which would render
 *   as a full JavaScript date string in the reader's time zone and, west of
 *   UTC, a day early. Dates are turned back into the YYYY-MM-DD written.
 */
export async function loadNews(options: {
  enabled: boolean;
  maxItems: number;
  path?: string;
}): Promise<NewsItem[]> {
  if (!options.enabled) return [];

  const newsPath = options.path ?? DEFAULT_NEWS_PATH;
  let source: string;
  try {
    source = await fs.readFile(newsPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Homepage news is enabled but ${newsPath} was not found. Add the file, or set site.homepage.news.enabled to false.`,
        { cause: error }
      );
    }
    throw error;
  }

  const parsed = yaml.load(source);
  if (parsed === undefined || parsed === null) return [];
  if (!Array.isArray(parsed)) {
    throw new Error(`${newsPath} must be a list of news items, each with a date and a title.`);
  }

  return parsed
    .slice(0, options.maxItems)
    .map((item: Record<string, unknown>, index: number) => toNewsItem(item, `${newsPath} item ${index + 1}`));
}

/**
 * One news item from its YAML fields. `where` names the item in errors.
 *
 * Titles may use inline Markdown (see `inlineMarkdown.ts`). An entry with a
 * `url` and a link in its title fails the build: the `url` would wrap the
 * whole title in a link, and a link cannot contain another.
 */
export function toNewsItem(item: Record<string, unknown>, where: string): NewsItem {
  const title = String(item.title ?? "");
  const label = `${where} ("${title}")`;
  let rendered;
  try {
    rendered = renderInlineMarkdown(title);
  } catch (error) {
    throw new Error(`${label}: ${(error as Error).message}`, { cause: error });
  }
  const url = item.url ? String(item.url) : undefined;
  if (url !== undefined && rendered.hasLink) {
    throw new Error(
      `${label} has both a url and a link in its title. A link cannot sit inside another link: remove the url, or the [text](url) link from the title.`
    );
  }
  if (url !== undefined && !isSafeUrl(url)) {
    throw new Error(`${label}: url "${url}" is not allowed; use an http(s), mailto or site-relative URL.`);
  }
  return { ...item, date: formatNewsDate(item.date), title, titleHtml: rendered.html } as NewsItem;
}

function formatNewsDate(value: unknown): string {
  // js-yaml builds timestamps in UTC, so the UTC fields are the ones written.
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}
