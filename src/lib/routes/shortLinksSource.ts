import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  buildReservedRoutes,
  resolveShortLinks,
  type ShortLinkResult,
  type ShortLinkSource
} from "./shortLinks";

/**
 * Filesystem side of `shortUrl` collection. Kept apart from `shortLinks.ts` so
 * that the content collection schema — and anything that ends up in a client
 * bundle — never pulls `node:fs` in transitively.
 *
 * This runs at Astro config load rather than during the content pipeline,
 * because `redirects` has to be known before the build starts. Editing a
 * `shortUrl` therefore needs a dev server restart, matching the existing
 * expectation for `src/site/config.ts`.
 */

const WRITING_DIR = "src/content/writing";
const PAGES_DIR = "src/content/pages";

/**
 * Content ids relative to `dir`, extension stripped and separators normalized
 * to `/`, matching the ids Astro's glob loader produces.
 */
function listContentIds(dir: string): string[] {
  let dirEntries: fs.Dirent[];
  try {
    dirEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  return dirEntries.flatMap((dirEntry) => {
    const full = path.join(dir, dirEntry.name);
    if (dirEntry.isDirectory()) return listContentIds(full);
    if (!/\.(md|mdx)$/.test(dirEntry.name)) return [];
    return [full];
  });
}

function toId(root: string, file: string): string {
  return path.relative(root, file).replace(/\.[^.]+$/, "").split(path.sep).join("/");
}

export function readShortLinkSources(dir: string): ShortLinkSource[] {
  return listContentIds(dir).map((file) => {
    const parsed = matter(fs.readFileSync(file, "utf8"));
    const shortUrl = parsed.data.shortUrl;
    // A draft is not built, so its short URL would redirect to a 404 and
    // publish the draft's path. Its id is still returned so its route stays
    // reserved for when it is published.
    const isDraft = parsed.data.draft === true;
    return {
      id: toId(dir, file),
      data: { shortUrl: typeof shortUrl === "string" && !isDraft ? shortUrl : undefined }
    };
  });
}

export function readContentIds(dir: string): string[] {
  return listContentIds(dir).map((file) => toId(dir, file));
}

export function collectShortLinks(
  options: { root?: string; writingDir?: string; pagesDir?: string } = {}
): ShortLinkResult {
  const root = options.root ?? process.cwd();
  const writingDir = path.resolve(root, options.writingDir ?? WRITING_DIR);
  const pagesDir = path.resolve(root, options.pagesDir ?? PAGES_DIR);

  const sources = readShortLinkSources(writingDir);
  const reserved = buildReservedRoutes({
    writingIds: sources.map((source) => source.id),
    pageIds: readContentIds(pagesDir)
  });

  return resolveShortLinks(sources, reserved);
}
