import type { APIRoute } from "astro";

import { siteConfig } from "../config";
import { robotsTxt } from "../lib/meta/robots";

/**
 * `/robots.txt`, built from `site.url` and `site.robots.disallow`. A site that
 * wants full control (per-crawler groups, say) can put its own file at
 * `public/robots.txt`; Astro then serves that file and skips this route.
 */
export const GET: APIRoute = () =>
  new Response(robotsTxt({ url: siteConfig.url, disallow: siteConfig.robots.disallow }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
