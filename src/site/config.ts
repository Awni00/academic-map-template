import type { SiteConfigOverrides } from "../config/types";

/**
 * Site-owned configuration overrides.
 *
 * Defaults live in `src/config/defaults/` — one file per section (`site.ts`,
 * `theme.ts`, `publications.ts`, `graph.ts`, `writing.ts`, `entryTypes.ts`).
 * Edit this file rather than those, so template updates keep reaching you.
 *
 * Anything omitted here is inherited, so an empty object is a valid config and
 * the sketch below is only a starting point — uncomment what you want to
 * change and delete the rest. `docs/configuration.md` covers every section,
 * including the ones deliberately left out here: graph appearance, writing
 * layout, and the entry-type registry.
 *
 * Two things that catch people out:
 *   - Objects merge into the defaults, but **arrays replace them**. Overriding
 *     `nav` or `entryTypes` means listing every item you want, not just the
 *     new ones.
 *   - The dev server reads this at startup. Restart it after editing — a hot
 *     reload can leave the old values in place and make a change look broken.
 */
export const siteConfigOverrides: SiteConfigOverrides = {
  // Who the site is about. Shown in the header, the homepage hero, and page
  // metadata. `url` is also what absolute links and the sitemap are built from.
  // site: {
  //   title: "Academic Website",
  //   name: "Your Name",
  //   role: "PhD Student",
  //   affiliation: "Your University",
  //   description: "Academic website and linked research writing.",
  //   url: "https://example.com",
  //   profileImage: "/profile.svg",
  //   ogImage: "/og-image.svg",
  //   links: {
  //     email: "mailto:you@example.com",
  //     cv: "/cv.pdf",
  //     github: "https://github.com/example",
  //     scholar: "https://scholar.google.com/"
  //   },
  //   // Replaces the default nav entirely — list every item you want.
  //   nav: [
  //     { label: "Home", href: "/" },
  //     { label: "Writing", href: "/writing" },
  //     { label: "Publications", href: "/publications" },
  //     { label: "Research", href: "/research" },
  //     { label: "Teaching", href: "/teaching" },
  //     { label: "CV", href: "/cv.pdf" }
  //   ]
  // },

  // Which of the registered themes the site uses. Ten ship with the template
  // (see docs/theming.md, or run the dev server and open /fixtures/themes to
  // compare them); `src/site/themes.ts` is where you define your own.
  // theme: {
  //   light: "dawn",          // paper | dawn | everforest-light | latte | github-light
  //   dark: "rose-pine",      // ink | rose-pine | everforest-dark | mocha | github-dark
  //   defaultMode: "system",  // "light" | "dark" | "system"
  //   allowToggle: true
  // },

  // Your BibTeX file, and the name to highlight in author lists.
  // publications: {
  //   source: "src/data/publications.bib",
  //   authorHighlight: ["Your Name"]
  // }
};
