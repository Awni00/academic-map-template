import { createRequire } from "node:module";
import path from "node:path";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { siteConfig } from "./src/config/site";
import { darkTheme, lightTheme } from "./src/config/theme";
import { writingConfig } from "./src/config/writing";
import { defaultMathMacros } from "./src/lib/math/macros";
import { rehypeKatexWithMacros } from "./src/lib/math/rehypeKatexWithMacros";
import { collectShortLinks } from "./src/lib/routes/shortLinksSource";
import { remarkWikilinks } from "./src/lib/wikilinks/remarkWikilinks";
import { siteFonts } from "./src/site/fonts";
import { globalMathMacros, mathMacroPacks } from "./src/site/math";

// Dependencies do not always live under the Astro project root. The common
// case is a git worktree: the worktree is the project root, but its
// node_modules holds only caches and packages resolve to the main checkout.
// Vite's dev server only serves files inside `server.fs.allow` (the project
// root by default) and answers 403 otherwise, which silently breaks every
// client island — @astrojs/react's client runtime never loads — and the
// KaTeX web fonts. Resolving a known dependency tells us where node_modules
// actually is; in a normal checkout this is already inside the root and the
// extra entry is a no-op. Dev server only: builds bundle these assets.
const packageRoot = path.dirname(
  path.dirname(createRequire(import.meta.url).resolve("astro/package.json"))
);

// `shortUrl` frontmatter, collected here because Astro needs `redirects` before
// the build starts. A conflicting short link is dropped with a warning rather
// than thrown, so a typo does not take the dev server down mid-edit;
// `npm run validate` reports the same issue as a hard error.
const shortLinks = collectShortLinks();
for (const issue of shortLinks.issues) {
  console.warn(`[shortUrl] ${issue.message}`);
}
const shortLinkPaths = new Set(Object.keys(shortLinks.redirects));

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
  [
    rehypeKatexWithMacros,
    {
      defaultMacros: defaultMathMacros,
      globalMacros: globalMathMacros,
      macroPacks: mathMacroPacks,
      throwOnError: false
    }
  ]
];

export default defineConfig({
  site: siteConfig.url,
  output: "static",
  redirects: shortLinks.redirects,
  fonts: siteFonts,
  devToolbar: {
    enabled: false
  },
  integrations: [
    mdx({
      remarkPlugins,
      rehypePlugins
    }),
    react(),
    // Redirect stubs point at a canonical URL that is itself indexed, so
    // keeping them out of the sitemap avoids advertising duplicate content.
    sitemap({
      filter: (page) => !shortLinkPaths.has(new URL(page).pathname.replace(/\/$/, "") || "/")
    })
  ],
  markdown: {
    remarkPlugins,
    rehypePlugins,
    shikiConfig: {
      // One theme per site theme, picked by the two ids in `theme.light` /
      // `theme.dark`. `defaultColor: false` makes Shiki emit `--shiki-light`
      // and `--shiki-dark` custom properties on each token instead of a
      // literal `style="color:#..."`, which is what lets a code block follow
      // `data-theme` at all — see the mapping in src/styles/article.css.
      themes: {
        light: lightTheme.shiki,
        dark: darkTheme.shiki
      },
      defaultColor: false
    }
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        // Setting `allow` replaces Vite's default, so keep the project root.
        allow: [process.cwd(), packageRoot]
      }
    }
  }
});
