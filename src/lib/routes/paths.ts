import { writingConfig } from "../../config/writing";

export function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

export function normalizeRoute(route: string): string {
  const clean = stripSlashes(route);
  return clean ? `/${clean}` : "/";
}

export function joinUrl(...parts: Array<string | undefined>): string {
  const clean = parts
    .filter((part): part is string => Boolean(part))
    .map((part) => stripSlashes(part))
    .filter(Boolean);
  return `/${clean.join("/")}`;
}

export function writingRoute(route: string = writingConfig.route): string {
  return normalizeRoute(route);
}

export function writingRouteParam(route = writingConfig.route): string {
  return stripSlashes(route);
}

export function writingEntryUrl(entryPath: string, route: string = writingConfig.route): string {
  return joinUrl(route, entryPath);
}

export function rssRoute(): string {
  return normalizeRoute(writingConfig.rss.route);
}

/**
 * The RSS feed's static path param and the href that reaches it, or undefined
 * when `rss.enabled` is false. The page is `[...rss].xml.ts`, so the built
 * file always ends in `.xml`; deriving the href from the param keeps links
 * pointing at the file that is actually built.
 */
export function rssFeed(
  rss: { enabled: boolean; route: string } = writingConfig.rss
): { param: string; href: string } | undefined {
  if (!rss.enabled) return undefined;
  const param = stripSlashes(rss.route).replace(/\.xml$/, "");
  return { param, href: `/${param}.xml` };
}

export function pageUrlFromId(id: string): string {
  const withoutHome = id.replace(/(^|\/)home$/, "");
  return withoutHome ? joinUrl(withoutHome) : "/";
}

export function pageIdFromPath(path: string | undefined): string {
  const clean = stripSlashes(path ?? "");
  return clean || "home";
}

export function pathMatchesRoute(path: string | undefined, route: string = writingConfig.route): boolean {
  return stripSlashes(path ?? "") === stripSlashes(route);
}

export function pathEntrySlug(path: string | undefined, route: string = writingConfig.route): string | undefined {
  const cleanPath = stripSlashes(path ?? "");
  const cleanRoute = stripSlashes(route);
  if (!cleanPath.startsWith(`${cleanRoute}/`)) return undefined;
  return cleanPath.slice(cleanRoute.length + 1);
}
