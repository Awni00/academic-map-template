import type { APIRoute } from "astro";

import { readFaviconSvg, renderFaviconIco } from "../lib/meta/icons";

/**
 * `/favicon.ico`, rendered from `public/favicon.svg` at 16, 32 and 48px. A
 * hand-made `public/favicon.ico` takes precedence; Astro then skips this route.
 */
export const GET: APIRoute = async () => {
  const ico = await renderFaviconIco(readFaviconSvg());
  return new Response(new Uint8Array(ico), { headers: { "Content-Type": "image/x-icon" } });
};
