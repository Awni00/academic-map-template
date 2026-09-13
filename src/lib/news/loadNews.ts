import fs from "node:fs/promises";

import yaml from "js-yaml";

export type NewsItem = {
  date: string;
  title: string;
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

  return parsed.slice(0, options.maxItems).map((item: Record<string, unknown>) => ({
    ...item,
    date: formatNewsDate(item.date),
    title: String(item.title ?? "")
  })) as NewsItem[];
}

function formatNewsDate(value: unknown): string {
  // js-yaml builds timestamps in UTC, so the UTC fields are the ones written.
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}
