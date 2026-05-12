export const writingConfig = {
  route: "/writing",
  label: "Writing",
  entryTypes: ["hub", "paper", "post", "note", "teaching", "project"],
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
    includeTypes: ["paper", "post", "note", "teaching", "project"],
    excludeTypes: ["hub"]
  },
  browser: {
    defaultView: {
      desktop: "map",
      mobile: "topics"
    },
    urlState: true,
    focus: {
      defaultMode: "dim",
      allowModeToggle: true,
      defaultDepth: 1,
      allowDepthToggle: true
    },
    mobile: {
      graphPlacement: "collapsed",
      defaultPreviewMode: "cards"
    }
  },
  entryLayout: {
    articleLayout: {
      default: "distill",
      byType: {
        hub: "wide",
        paper: "distill",
        post: "distill",
        note: "narrow",
        teaching: "narrow",
        project: "wide"
      }
    },
    sidebar: {
      default: true,
      byType: {
        hub: true,
        paper: true,
        post: true,
        note: true,
        teaching: false,
        project: true
      },
      sections: ["toc", "localGraph", "backlinks", "related"]
    },
    localGraph: {
      enabled: true,
      defaultDepth: 1,
      maxNodes: 20,
      mobile: "collapsed",
      byType: {
        hub: true,
        paper: true,
        post: true,
        note: true,
        teaching: false,
        project: true
      }
    },
    hubPages: {
      autoRenderLinkedEntries: true,
      groupLinkedEntriesBy: "type"
    }
  },
  validation: {
    links: {
      unresolvedWikilinks: "warn",
      unresolvedFrontmatterLinks: "warn"
    }
  }
} as const;

export type EntryType = (typeof writingConfig.entryTypes)[number];
