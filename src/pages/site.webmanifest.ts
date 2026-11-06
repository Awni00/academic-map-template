import type { APIRoute } from "astro";

import { lightTheme, siteConfig } from "../config";
import { webManifest } from "../lib/meta/manifest";

export const GET: APIRoute = () => {
  const manifest = webManifest({
    title: siteConfig.title,
    name: siteConfig.name,
    description: siteConfig.description,
    backgroundColor: lightTheme.colors.bg,
    themeColor: lightTheme.colors.bg
  });
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { "Content-Type": "application/manifest+json" }
  });
};
