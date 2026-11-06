import type { APIRoute, GetStaticPaths } from "astro";

import { manifestIconSizes, readFaviconSvg, renderSvgPng } from "../lib/meta/icons";

/** The web manifest's PNG icons, rendered from `public/favicon.svg`. */
export const getStaticPaths: GetStaticPaths = () =>
  manifestIconSizes.map((size) => ({ params: { size: String(size) } }));

export const GET: APIRoute = async ({ params }) => {
  const png = await renderSvgPng(readFaviconSvg(), Number(params.size));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
