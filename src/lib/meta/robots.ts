/**
 * The text of `/robots.txt`.
 *
 * Every crawler may fetch everything except the paths in `site.robots.disallow`,
 * and the `Sitemap:` line points at the index `@astrojs/sitemap` writes. The
 * sitemap URL is built from `site.url`, so it follows the configured domain.
 */
export function robotsTxt(options: { url: string; disallow: readonly string[] }): string {
  const lines = ["User-agent: *"];
  if (options.disallow.length === 0) {
    lines.push("Allow: /");
  } else {
    for (const path of options.disallow) lines.push(`Disallow: ${path}`);
  }
  lines.push("", `Sitemap: ${new URL("/sitemap-index.xml", options.url).toString()}`);
  return `${lines.join("\n")}\n`;
}

/**
 * Problems with `site.robots.disallow`. A robots.txt rule is a path prefix
 * matched against the URL path, so anything not starting with `/` (a full URL,
 * a bare file name) would never match and silently block nothing.
 */
export function validateRobotsDisallow(disallow: readonly string[]): {
  errors: string[];
  warnings: string[];
} {
  const errors = disallow
    .filter((path) => !path.startsWith("/") || /\s/.test(path))
    .map(
      (path) =>
        `site.robots.disallow: "${path}" must be a URL path starting with "/" and without spaces (e.g. "/cv.pdf").`
    );
  return { errors, warnings: [] };
}
