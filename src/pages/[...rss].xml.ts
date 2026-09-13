import { getCollection } from "astro:content";

import { entryTypeIncludedInRss, siteConfig, writingConfig } from "../config";
import { buildGraphIndex } from "../lib/graph/buildGraph";
import { rssFeed, writingRoute } from "../lib/routes/paths";

export async function getStaticPaths() {
  const feed = rssFeed();
  return feed ? [{ params: { rss: feed.param } }] : [];
}

export async function GET() {
  const entries = await getCollection("writing", ({ data }) => {
    return (
      data.draft !== true &&
      Boolean(data.date) &&
      entryTypeIncludedInRss(data.type)
    );
  });
  const graph = buildGraphIndex(entries, { collectWarnings: false }).index;
  const items = graph.nodes.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const siteUrl = siteConfig.url.replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)} ${escapeXml(writingConfig.label)}</title>
    <link>${siteUrl}${writingRoute()}</link>
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
