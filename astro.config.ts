import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { siteConfig } from "./src/config/site";
import { writingConfig } from "./src/config/writing";
import { mathMacros } from "./src/lib/math/macros";
import { remarkWikilinks } from "./src/lib/wikilinks/remarkWikilinks";

const remarkPlugins: any[] = [
  remarkGfm,
  remarkMath,
  [remarkWikilinks, { contentDir: "src/content/writing", writingRoute: writingConfig.route }]
];

const rehypePlugins: any[] = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] }
    }
  ],
  [rehypeKatex, { macros: mathMacros, throwOnError: false }]
];

export default defineConfig({
  site: siteConfig.url,
  output: "static",
  devToolbar: {
    enabled: false
  },
  integrations: [
    mdx({
      remarkPlugins,
      rehypePlugins
    }),
    react(),
    sitemap()
  ],
  markdown: {
    remarkPlugins,
    rehypePlugins,
    shikiConfig: {
      theme: "github-light"
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
