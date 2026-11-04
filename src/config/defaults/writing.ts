import type { WritingConfig } from "../types";

export const defaultWritingConfig = {
  route: "/writing",
  label: "Writing",
  description: "Research notes, paper explainers, and teaching materials, organised as a linked map.",
  entryTypes: [],
  search: {
    writing: {
      enabled: true,
      implementation: "simple",
      scope: "writing",
      fields: ["title", "summary", "tags", "type"]
    },
    site: {
      enabled: false
    }
  },
  rss: {
    enabled: true,
    route: "/writing/rss.xml",
    includeTypes: [],
    excludeTypes: []
  },
  browser: {
    topics: {
      showHubSummaries: true,
      density: "comfortable",
      showDensityToggle: false,
      paginationMode: "preview",
      pageSize: 8,
      defaultSort: { field: "date", dir: "desc" },
      sortOptions: ["date", "title", "type"]
    },
    list: {
      density: "comfortable",
      showDensityToggle: false,
      showTypeFilter: true,
      defaultSort: { field: "date", dir: "desc" },
      sortOptions: ["date", "title", "type"]
    }
  },
  entryLayout: {
    mode: {
      default: "article",
      byType: {}
    },
    localGraph: {
      defaultDepth: 1,
      maxNodes: 20,
      hover: { labels: "node" }
    },
    figureNumbers: false,
    diagramReplay: true,
    toc: {
      default: {
        minDepth: 2,
        maxDepth: 3
      },
      byType: {}
    },
    placement: {
      default: {
        toc: { where: "left" },
        localGraph: { where: "footer" },
        related: { where: "footer", withLocalGraph: false }
      },
      byType: {}
    },
    asides: {
      default: "inline",
      byType: {}
    }
  },
  validation: {
    links: {
      unresolvedWikilinks: "warn",
      unresolvedFrontmatterLinks: "warn"
    }
  }
} satisfies WritingConfig;
