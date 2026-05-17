const ENTRY_TYPES = ["hub", "sub-hub", "paper", "post", "note", "teaching", "project"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/**
 * Placement vocabulary for each article-shell section.
 *
 * `PlacementToc` — "left" | "right" | "none". The TOC strip lives in
 *   either the left margin (Distill default) or the right rail. Legacy
 *   value "sidebar" is silently mapped to "right" by `resolvePlacement`.
 * `PlacementGraph` — local-graph slot. The article shell only renders
 *   the graph in the header or footer.
 * `PlacementNav` — backlinks/related-list slots.
 * `AsidePlacement` — whether `<Aside>` blocks render in the right
 *   margin gutter or inline within the prose.
 */
export type PlacementToc = "left" | "right" | "none";
export type PlacementGraph = "header" | "footer" | "none";
export type PlacementNav = "left" | "right" | "footer" | "none";
export type AsidePlacement = "margin" | "inline";

export type PlacementSpec = {
  toc: { where: PlacementToc };
  localGraph: { where: PlacementGraph };
  backlinks: { where: PlacementNav };
  related: { where: PlacementNav };
};

/**
 * Article-body width.
 *   "reading" — capped at 720px reading column (papers, posts, notes).
 *   "flex"    — fills the available width up to the grid maximum (hubs,
 *               projects). The right gutter for asides degrades to inline
 *               in this mode because the body consumes it.
 */
export type ArticleWidth = "reading" | "flex";

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
    excludeTypes: ["hub", "sub-hub"]
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
    /**
     * Article body width per entry type. "reading" caps at 720px;
     * "flex" expands to fill the grid (used by hubs and projects, which
     * benefit from extra horizontal room for graphs and dashboards).
     */
    articleWidth: {
      default: "reading" as ArticleWidth,
      byType: {
        hub: "flex" as ArticleWidth,
        "sub-hub": "flex" as ArticleWidth,
        paper: "reading" as ArticleWidth,
        post: "reading" as ArticleWidth,
        note: "reading" as ArticleWidth,
        teaching: "reading" as ArticleWidth,
        project: "flex" as ArticleWidth
      }
    },
    localGraph: {
      enabled: true,
      defaultDepth: 1,
      maxNodes: 20,
      mobile: "collapsed",
      byType: {
        hub: true,
        "sub-hub": true,
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
     * Where each article section is rendered: in the left or right
     * margin, in the article header, in the footer, or not at all.
     * Resolution order is `default` → `byType[entry.type]` → entry
     * frontmatter `layout.placement.*`, newest wins. Per-entry frontmatter
     * overrides are partial.
     */
    placement: {
      default: {
        toc: { where: "left" as PlacementToc },
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
        "sub-hub": {
          toc: { where: "none" as PlacementToc },
          localGraph: { where: "header" as PlacementGraph }
        },
        // Teaching uses a focused single-column read — no TOC.
        teaching: {
          toc: { where: "none" as PlacementToc }
        }
      } as Partial<Record<EntryType, Partial<PlacementSpec>>>
    },
    /**
     * Where `<Aside>` blocks render. "margin" floats them into the right
     * gutter (Distill-style); "inline" renders them as left-bordered
     * blocks in the prose. Resolution order: default → byType →
     * frontmatter (`layout.asides`) → per-instance `<Aside placement>`.
     *
     * Auto-degrade: `"margin"` falls back to `"inline"` when the article
     * has no right gutter (flex-width entries, TOC on right, narrow
     * viewports). The fall-back is silent.
     */
    asides: {
      default: "inline" as AsidePlacement,
      byType: {
        paper: "margin" as AsidePlacement,
        post: "margin" as AsidePlacement
      } as Partial<Record<EntryType, AsidePlacement>>
    }
  },
  validation: {
    links: {
      unresolvedWikilinks: "warn",
      unresolvedFrontmatterLinks: "warn"
    }
  }
} as const;
