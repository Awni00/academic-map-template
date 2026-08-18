import type { WritingConfig } from "../types";

export const defaultWritingConfig = {
  route: "/writing",
  label: "Writing",
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
    defaultView: {
      desktop: "map",
      mobile: "topics"
    },
    urlState: true,
    focus: {
      mode: "dim",
      depth: 1
    },
    mobile: {
      graphPlacement: "collapsed",
      defaultPreviewMode: "cards"
    },
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
      enabled: true,
      defaultDepth: 1,
      maxNodes: 20,
      mobile: "collapsed",
      byType: {}
    },
    hubPages: {
      autoRenderLinkedEntries: true,
      groupLinkedEntriesBy: "type"
    },
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
        backlinks: { where: "footer" },
        related: { where: "footer" }
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
