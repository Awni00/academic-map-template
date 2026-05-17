export const siteConfig = {
  title: "Academic Website",
  name: "Your Name",
  role: "PhD Student",
  affiliation: "Your University",
  description: "Academic website and linked research writing.",
  url: "https://example.com",
  profileImage: "/profile.svg",
  ogImage: "/og-image.svg",
  links: {
    email: "mailto:you@example.com",
    cv: "/cv.pdf",
    github: "https://github.com/example",
    scholar: "https://scholar.google.com/"
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Writing", href: "/writing" },
    { label: "Publications", href: "/publications" },
    { label: "Research", href: "/research" },
    { label: "Teaching", href: "/teaching" },
    { label: "CV", href: "/cv.pdf" }
  ],
  homepage: {
    hero: { enabled: true },
    researchSummary: { enabled: true, source: "home" },
    /**
     * "Explore Writing" widget rendered below the hero. See
     * `src/components/graph/WritingPreview.tsx` for the implementation and
     * the README ("Homepage: Explore Writing widget") for an overview.
     */
    writingPreview: {
      enabled: true,
      /** What to render on desktop viewports (>680px). */
      desktopMode: "graph",
      /** What to render on mobile viewports (≤680px). */
      mobileMode: "topic-cards",
      /**
       * Which nodes feed the graph view. Three modes:
       *   { mode: "all" }                                  — every node.
       *   { mode: "types", types: ["paper", ...] }         — keep nodes of these types.
       *   { mode: "neighborhood", roots: "hubs", depth, perRoot }
       *                                                    — BFS outward from `roots`.
       *                                                       `depth`/`perRoot` accept `null`
       *                                                       to mean "no limit".
       * Ignored when both modes are "topic-cards" (the cards view shows hubs only).
       */
      filter: {
        mode: "neighborhood",
        roots: "hubs",
        depth: null,
        perRoot: null
      },
      /** Hard cap on graph nodes after `filter`. `null` = no cap. */
      maxNodes: null,
      /** Pixel height of the graph canvas slot. */
      previewHeight: 360,
      /** Where the "Open full map →" CTA links to. */
      clickTarget: "/writing",
      title: "Explore Writing",
      description:
        "Research notes, paper explainers, and teaching materials organized as a linked map."
    },
    selectedPublications: {
      enabled: true,
      field: "selected",
      maxItems: 5
    },
    recentWriting: {
      enabled: true,
      maxItems: 3
    },
    news: {
      enabled: true,
      maxItems: 5
    }
  }
} as const;
