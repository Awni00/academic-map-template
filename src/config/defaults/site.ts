import type { SiteConfig } from "../types";

export const defaultSiteConfig = {
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
    hero: {
      enabled: true,
      photo: {
        side: "left",
        width: 240,
        shape: "rounded",
        radius: 12,
        position: "50% 22%",
        sticky: false
      },
      caption: {
        showName: true,
        extra: []
      },
      links: {
        show: ["email", "cv", "scholar", "github", "x", "linkedin"],
        style: { desktop: "pills", mobile: "pills" }
      },
      phone: { layout: "centered" }
    },
    researchSummary: { enabled: true, source: "home" },
    writingPreview: {
      enabled: true,
      desktopMode: "graph",
      mobileMode: "topic-cards",
      interactive: true,
      filter: {
        mode: "neighborhood",
        roots: "hubs",
        depth: null,
        perRoot: null
      },
      maxNodes: null,
      previewHeight: 360,
      clickTarget: "/writing",
      title: "Explore Writing",
      description:
        "Research notes, paper explainers, and teaching materials organized as a linked map."
    },
    selectedPublications: {
      enabled: true,
      field: "selected",
      maxItems: 5,
      abstractDisplay: "popup"
    },
    recentWriting: {
      enabled: true,
      title: "Recent writing",
      maxItems: 6,
      viewAll: {
        enabled: true,
        label: "View all →"
      }
    },
    news: {
      enabled: true,
      maxItems: 5
    }
  }
} as const satisfies SiteConfig;
