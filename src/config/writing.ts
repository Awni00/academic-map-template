const ENTRY_TYPES = ["hub", "paper", "post", "note", "teaching", "project"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export type PlacementToc = "sidebar" | "none";
export type PlacementGraph = "header" | "footer" | "none";
export type PlacementNav = "footer" | "sidebar" | "none";
export type TocStyle = "strip" | "text";

export type PlacementSpec = {
  toc: { where: PlacementToc; style?: TocStyle };
  localGraph: { where: PlacementGraph };
  backlinks: { where: PlacementNav };
  related: { where: PlacementNav };
};

export const writingConfig = {
  route: "/writing",
  label: "Writing",
  entryTypes: ENTRY_TYPES,
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
    /**
     * How the writing browser reacts when a topic (hub) is focused —
     * either via the Topics list in the left panel, or via `?focus=<id>`
     * in the URL. Both fields are config-only; the controls are not
     * exposed in the UI.
     *   mode  — "dim" keeps non-neighbours visible but faded;
     *           "filter" removes them from the canvas entirely.
     *   depth — neighbourhood radius in edges (BFS hops) from the
     *           focused hub. 1 = direct neighbours, 2 = neighbours of
     *           neighbours.
     */
    focus: {
      mode: "dim" as "dim" | "filter",
      depth: 1 as 1 | 2
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
    /**
     * Legacy sidebar feature flag. `false` for an entry type forces every
     * section out of the sidebar (i.e., collapses the right rail). The
     * fine-grained `placement` block below is the source of truth for
     * what actually renders where; this is kept for back-compat.
     */
    sidebar: {
      default: true,
      byType: {
        hub: true,
        paper: true,
        post: true,
        note: true,
        teaching: false,
        project: true
      }
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
    },
    /**
     * Where each article section is rendered: in the sticky right sidebar,
     * up in the article header, down in the article footer, or not at all.
     * Resolution order is `default` → `byType[entry.type]` → entry
     * frontmatter `layout.placement.*`, newest wins. Per-entry frontmatter
     * overrides are partial: setting just `{ style: "text" }` preserves the
     * `where` value resolved from the previous level.
     */
    placement: {
      default: {
        toc: { where: "sidebar" as PlacementToc, style: "strip" as TocStyle },
        localGraph: { where: "footer" as PlacementGraph },
        backlinks: { where: "footer" as PlacementNav },
        related: { where: "footer" as PlacementNav }
      },
      byType: {
        // Hubs have few headings of their own; their LocalGraph IS the
        // contextual landmark, so promote it to the header and drop the TOC.
        hub: {
          toc: { where: "none" as PlacementToc },
          localGraph: { where: "header" as PlacementGraph }
        },
        // Teaching uses the narrow article variant — no sidebar, everything
        // in the footer. Placement reflects that.
        teaching: {
          toc: { where: "none" as PlacementToc }
        }
      } as Partial<Record<EntryType, Partial<PlacementSpec>>>
    }
  },
  validation: {
    links: {
      unresolvedWikilinks: "warn",
      unresolvedFrontmatterLinks: "warn"
    }
  }
} as const;
