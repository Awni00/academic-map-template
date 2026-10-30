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
  //   ],
  //   // Homepage sections. Each can be switched off with `enabled: false`.
  //   homepage: {
  //     // Photo, caption, and links in a card beside the bio. Every option is
  //     // in docs/configuration.md#homepage-hero.
  //     hero: {
  //       photo: { side: "left", width: 240, position: "50% 22%" },
  //       links: {
  //         show: ["email", "cv", "scholar", "github", "x", "linkedin"],
  //         style: { desktop: "pills", mobile: "pills" }  // pills | icons | list | text | text-icons
  //       },
  //       phone: { layout: "centered" }                   // "centered" | "compact"
  //     },
  //     recentWriting: {
  //       title: "Recent writing",  // e.g. "Recent posts" if you rename Writing
  //       maxItems: 6,              // newest dated entries shown in the carousel
  //       select: "featured-first", // "featured-first" | "recent" | "featured"
  //       // The card that ends the row; `description` defaults to
  //       // "Browse {writing.label}", and "" hides it.
  //       viewAll: { enabled: true, label: "View all →" }
  //     }
  //   }
  // },

  // Which of the registered themes the site uses. Ten ship with the template
  // (see docs/theming.md, or run the dev server and open /fixtures/themes to
  // compare them); `src/site/themes.ts` is where you define your own.
  // theme: {
  //   light: "dawn",          // paper | dawn | everforest-light | latte | github-light
  //   dark: "rose-pine",      // ink | rose-pine | everforest-dark | mocha | github-dark
  //   defaultMode: "system",  // "light" | "dark" | "system"
  //   allowToggle: true,
  //   // Justified prose (default off); a page's `article.justify` overrides it.
  //   typography: {
  //     justify: { enabled: false, hyphenate: true, minWidth: "all" }
  //   },
  //   // Page width including gutters; the header, footer, and homepage share it.
  //   layout: { contentWidth: 1020 },
  //   // Default look of <HoverNote>; pages and notes can override it.
  //   hoverNotes: {
  //     marker: "superscript",  // "superscript" | "bracket"
  //     appearance: "card"      // "card" | "inverted"; <Term> uses it too
  //   },
  //   // Default look of <Term>; pages and terms can override it.
  //   terms: {
  //     underline: "dotted"     // "dotted" | "none"
  //   }
  // },

  // Your BibTeX file, and the name to highlight in author lists.
  // publications: {
  //   source: "src/data/publications.bib",
  //   authorHighlight: ["Your Name"]
  // }
};
