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
    writingPreview: {
      enabled: true,
      placement: "below-hero",
      desktopMode: "static-graph",
      mobileMode: "topic-cards",
      filter: {
        mode: "neighborhood",
        roots: "hubs",
        depth: 1,
        perRoot: 3
      },
      maxNodes: 22,
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
