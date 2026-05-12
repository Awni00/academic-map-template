import { getCollection } from "astro:content";

import { siteConfig } from "../config/site";
import { writingConfig } from "../config/writing";
import { buildGraphIndex } from "../lib/graph/buildGraph";
import { rssRoute, stripSlashes } from "../lib/routes/paths";

export async function getStaticPaths() {
  return [
    {
      params: { rss: stripSlashes(rssRoute()).replace(/\.xml$/, "") }
    }
  ];
}

export async function GET() {
  const entries = await getCollection("writing", ({ data }) => {
    return (
      data.draft !== true &&
      Boolean(data.date) &&
      (writingConfig.rss.includeTypes as readonly string[]).includes(data.type) &&
      !(writingConfig.rss.excludeTypes as readonly string[]).includes(data.type)
    );
  });
  const graph = buildGraphIndex(entries, { collectWarnings: false }).index;
  const items = graph.nodes.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const siteUrl = siteConfig.url.replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)} ${escapeXml(writingConfig.label)}</title>
    <link>${siteUrl}${writingConfig.route}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${siteUrl}${item.url}</link>
      <guid>${siteUrl}${item.url}</guid>
      <pubDate>${new Date(item.date ?? "").toUTCString()}</pubDate>
      <description>${escapeXml(item.summary ?? "")}</description>
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
