import type { BundledTheme } from "shiki";
import type { NavIconName } from "./navIcons";

export type EntryType = string;

export type EntryTypeRole = "hub" | "section" | "entry";
export type GraphNodeShape = "circle" | "square" | "diamond" | "hexagon";
export type LabelVisibility = "always" | "hover" | "never";

export type PlacementToc = "left" | "right" | "none";
export type PlacementGraph = "header" | "footer" | "none";
/**
 * Where the "Related" link list goes. Footer-only: side rails are reserved for
 * the table of contents.
 */
export type PlacementRelated = "footer" | "none";
export type AsidePlacement = "margin" | "inline";
/**
 * Article presentation mode. "article" is the standard long-form layout;
 * "abstract" renders a short paper-record page whose body is the abstract.
 * This is a presentation axis only — the entry type still drives graph
 * styling, RSS, and recent-writing inclusion.
 */
export type ArticleMode = "article" | "abstract";
export type TocDepth = 2 | 3 | 4 | 5 | 6;
export type TocConfig = {
  minDepth: TocDepth;
  maxDepth: TocDepth;
};
export type TocConfigOverride = Partial<TocConfig>;

export type PlacementSpec = {
  toc: { where: PlacementToc };
  localGraph: { where: PlacementGraph };
  /**
   * The "Related" list: every entry linked to or from this page. It stands in
   * for the local graph, so by default it shows only on pages without one;
   * `withLocalGraph: true` shows it alongside the graph as well.
   */
  related: { where: PlacementRelated; withLocalGraph: boolean };
};

/** A partial `PlacementSpec`, as given by entry types, the site config, or frontmatter. */
export type PlacementOverride = {
  [K in keyof PlacementSpec]?: Partial<PlacementSpec[K]>;
};

export type EntryTypeGraphConfig = {
  shape: GraphNodeShape;
  /**
   * Glyph diameter in screen pixels. Constant at every zoom level, so a paper
   * reads as the same mark on the full map, the homepage preview, and a
   * page's local map.
   */
  size: number;
  color: string;
  /**
   * How this type's title is shown.
   *   "always" — painted on the canvas next to the node, permanently.
   *   "hover"  — floating label beside the cursor while hovered.
   *   "never"  — no label at all.
   */
  labelVisibility: LabelVisibility;
  /** Whether clicking a node of this type selects it. Defaults to true. */
  interactive?: boolean;
};

export type EntryTypeArticleConfig = {
  mode?: ArticleMode;
  placement?: PlacementOverride;
  asides?: AsidePlacement;
  toc?: TocConfigOverride;
};

export type EntryTypeDefinition = {
  id: EntryType;
  label: string;
  role: EntryTypeRole;
  ownsFolder?: boolean;
  includeInRss?: boolean;
  includeInRecent?: boolean;
  graph: EntryTypeGraphConfig;
  article?: EntryTypeArticleConfig;
};

export type TopicsDensity = "comfortable" | "minimal" | "dense";
export type TopicsPaginationMode = "preview" | "paged";
export type TopicsSortField = "date" | "title" | "type";
export type TopicsSortDir = "asc" | "desc";
export type TopicsSort = { field: TopicsSortField; dir: TopicsSortDir };
export type PublicationAbstractDisplay = "inline" | "popup" | "hidden";

/**
 * The Topics and List views of the writing browser. Both share its toolbar:
 * `sortOptions` are the choices in its Sort menu (and, in List, the column
 * labels that sort), and `showDensityToggle` adds a row-density switch to that
 * menu. Filters are the toolbar's, the same in every view.
 */
export type TopicsConfig = {
  showHubSummaries: boolean;
  density: TopicsDensity;
  showDensityToggle: boolean;
  paginationMode: TopicsPaginationMode;
  pageSize: number;
  defaultSort: TopicsSort;
  sortOptions: readonly TopicsSortField[];
};

export type ListConfig = {
  density: TopicsDensity;
  showDensityToggle: boolean;
  /**
   * @deprecated Ignored. Type filters now live in the toolbar's Filters panel,
   * shared by every view. Kept so existing configs still type-check.
   */
  showTypeFilter: boolean;
  defaultSort: TopicsSort;
  sortOptions: readonly TopicsSortField[];
};

export type WritingConfig = {
  route: string;
  label: string;
  /**
   * One line under the writing page's title, and the page's meta description.
   * Empty hides the line.
   */
  description?: string;
  entryTypes: readonly EntryType[];
  search: {
    writing: {
      enabled: boolean;
      implementation: "simple";
      scope: "writing";
      fields: readonly string[];
    };
    site: { enabled: boolean };
  };
  rss: {
    enabled: boolean;
    route: string;
    includeTypes: readonly EntryType[];
    excludeTypes: readonly EntryType[];
  };
  browser: {
    topics: TopicsConfig;
    list: ListConfig;
  };
  entryLayout: {
    mode: {
      default: ArticleMode;
      byType: Record<EntryType, ArticleMode>;
    };
    /**
     * How much of the graph a per-entry local map shows. *Whether* and *where*
     * it shows is `placement.localGraph.where`, which subsumed the boolean
     * these used to sit beside.
     */
    localGraph: {
      defaultDepth: number;
      maxNodes: number;
    };
    /**
     * Number figure and table captions ("Figure 3.", "Table 1.") in article
     * bodies. Off by default; an entry's `article.figureNumbers` overrides it.
     * Only captioned figures count, and a figure grid or toggle figure counts
     * once.
     */
    figureNumbers: boolean;
    /**
     * Whether an animated `<Diagram>` offers a Replay button after it has
     * played. On by default; a definition's `animate.replay` and the
     * component's `replay` prop override it, in that order of precedence
     * (the prop wins).
     */
    diagramReplay: boolean;
    toc: {
      default: TocConfig;
      byType: Record<EntryType, TocConfigOverride>;
    };
    placement: {
      default: PlacementSpec;
      byType: Record<EntryType, PlacementOverride>;
    };
    asides: {
      default: AsidePlacement;
      byType: Record<EntryType, AsidePlacement>;
    };
  };
  validation: {
    links: {
      unresolvedWikilinks: "warn" | "error" | "ignore";
      unresolvedFrontmatterLinks: "warn" | "error" | "ignore";
    };
  };
};

export type HeroPhotoSide = "left" | "right";
export type HeroPhotoShape = "rounded" | "circle" | "square";
export type HeroLinkStyle = "pills" | "icons" | "list" | "text" | "text-icons";
export type HeroPhoneLayout = "centered" | "compact";

/**
 * The homepage hero: a card with the photo, a short caption, and links beside
 * the bio column ("margin card"). Structure, breakpoints, gaps, the reading
 * measure, caption typography, and tap-target sizes are fixed by the template;
 * these are the parts a site can choose.
 */
export type HeroConfig = {
  enabled: boolean;
  photo: {
    side: HeroPhotoSide;
    /** Desktop card width in px, clamped to 180–300. Tablet uses 0.75×; phone a fixed 160px. */
    width: number;
    shape: HeroPhotoShape;
    /** Corner radius in px, used by `shape: "rounded"`. */
    radius: number;
    /** CSS `object-position` for the square crop, e.g. "50% 22%". */
    position: string;
    /** Keep the card in view while a long bio scrolls (desktop and tablet). */
    sticky: boolean;
  };
  caption: {
    showName: boolean;
    /** Extra lines under the affiliation, e.g. pronouns or a job-market note. */
    extra: readonly string[];
  };
  links: {
    /** Keys of `site.links` to show, in order. Keys with no link are skipped. */
    show: readonly string[];
    style: { desktop: HeroLinkStyle; mobile: HeroLinkStyle };
  };
  phone: { layout: HeroPhoneLayout };
};

/** A `site.links` entry beyond the known keys, e.g. ORCID or Bluesky. */
export type CustomLink = {
  label: string;
  href: string;
  /** A name from the hero icon registry (`src/lib/home/heroIcons.ts`); defaults to a generic link icon. */
  icon?: string;
};

export type SiteConfig = {
  title: string;
  name: string;
  role: string;
  affiliation: string;
  description: string;
  url: string;
  profileImage: string;
  ogImage: string;
  /**
   * Profile links by key. Known keys (`email`, `cv`, `scholar`, `github`, `x`,
   * `linkedin`, `orcid`, …) take a URL; anything else may be a `CustomLink`.
   */
  links: Record<string, string | CustomLink>;
  /**
   * The header's links. `icon` (a name from `navIconNames`) is drawn beside
   * the label in the phone menu; give every item one, or the menu shows none.
   */
  nav: readonly { label: string; href: string; icon?: NavIconName }[];
  homepage: {
    hero: HeroConfig;
    researchSummary: { enabled: boolean; source: string };
    writingPreview: {
      enabled: boolean;
      desktopMode: "graph" | "topic-cards";
      mobileMode: "graph" | "topic-cards";
      /** Click a node to select it and describe it in a panel beside the map. */
      interactive: boolean;
      filter:
        | { mode: "all" }
        | { mode: "types"; types?: EntryType[] }
        | {
            mode: "neighborhood";
            roots?: "hubs" | EntryType[];
            depth?: number | null;
            perRoot?: number | null;
          };
      maxNodes: number | null;
      previewHeight: number;
      /**
       * Overrides `graph.hover` for this map. A small canvas gets crowded
       * fast, so by default it names only the hovered node.
       */
      hover: Partial<GraphHoverConfig>;
      clickTarget: string;
      title: string;
      description: string;
    };
    selectedPublications: {
      enabled: boolean;
      field: string;
      maxItems: number;
      abstractDisplay: PublicationAbstractDisplay;
    };
    recentWriting: {
      enabled: boolean;
      title: string;
      maxItems: number;
      /**
       * Which entries fill the row, newest first within each group.
       * "featured-first": entries with `featured: true`, then the rest.
       * "recent": by date only. "featured": featured entries only.
       */
      select: RecentWritingSelect;
      /**
       * The card that ends the row and links to the writing browser.
       * `description` defaults to "Browse {writing.label}"; set it to ""
       * to show the label alone.
       */
      viewAll: {
        enabled: boolean;
        label: string;
        description?: string;
      };
    };
    news: {
      enabled: boolean;
      maxItems: number;
    };
  };
};

export type ThemeAppearance = "light" | "dark";

/**
 * Every colour token a theme supplies, without the `--color-` / `--graph-`
 * prefixes those become in CSS. Values may be any CSS colour; `defineTheme`
 * fills omitted ones with mixes derived from the core.
 *
 * `link` and `annotation` are optional roles split off the accent: links in
 * running text, and the words and marks that open a note (`<Term>`,
 * `<HoverNote>`). Each falls back to the accent, so a theme that sets neither
 * looks exactly as it would without them. Everything else interactive — nav,
 * pills, buttons, the graph — stays on `accent`.
 *
 * The semantic colours come in pairs. The bare token (`warning`) is the
 * palette's real hue and is only used for graphic elements — callout rules,
 * icons, graph nodes — where WCAG asks for 3:1. The `-text` variant is
 * darkened (or lightened) to clear 4.5:1 for the same colour used as text,
 * such as a callout's title. Tuning a single value to satisfy both turns
 * every gold in every palette into brown.
 */
export type ThemeColors = {
  bg: string;
  "bg-soft": string;
  "bg-soft-2": string;
  /**
   * Menus, sheets and other surfaces that float over the page. A light theme
   * keeps `bg`; a dark one is lifted toward `fg`, as elevation reads in dark
   * UIs. Text is drawn on it, so it is contrast-checked like `bg`.
   */
  "surface-raised": string;
  fg: string;
  "fg-soft": string;
  muted: string;
  "muted-2": string;
  border: string;
  "border-soft": string;
  rule: string;
  accent: string;
  "accent-soft": string;
  "accent-line": string;
  link: string;
  "link-line": string;
  annotation: string;
  "annotation-soft": string;
  "annotation-line": string;
  danger: string;
  "danger-text": string;
  warning: string;
  "warning-text": string;
  success: string;
  "success-text": string;
  info: string;
  "info-text": string;
  example: string;
  "example-text": string;
  quote: string;
  "quote-text": string;
  "graph-hub": string;
  "graph-sub-hub": string;
  "graph-paper": string;
  "graph-post": string;
  "graph-note": string;
  "graph-teaching": string;
  "graph-project": string;
  "graph-edge": string;
  /**
   * Chart and diagram colours (`<Chart>`, `<Diagram>`): six categorical
   * slots in a fixed order, a companion shade of each, and a neutral. See
   * `src/lib/theme/figureColors.ts`.
   */
  "figure-1": string;
  "figure-2": string;
  "figure-3": string;
  "figure-4": string;
  "figure-5": string;
  "figure-6": string;
  "figure-1-alt": string;
  "figure-2-alt": string;
  "figure-3-alt": string;
  "figure-4-alt": string;
  "figure-5-alt": string;
  "figure-6-alt": string;
  "figure-neutral": string;
  "placeholder-a": string;
  "placeholder-b": string;
};

/** The shadow stack, which differs between light and dark themes. */
export type ThemeShadows = {
  sm: string;
  md: string;
  soft: string;
};

export type Theme = {
  id: string;
  label: string;
  appearance: ThemeAppearance;
  /**
   * Theme used for fenced code blocks. Shiki ships with Astro, so any of its
   * bundled theme ids works — the type gives you the full list on autocomplete.
   */
  shiki: BundledTheme;
  colors: ThemeColors;
  shadows: ThemeShadows;
};

/** What a site author writes: the core three, plus anything else they want. */
export type ThemeInput = {
  id: string;
  label: string;
  appearance: ThemeAppearance;
  shiki?: BundledTheme;
  colors: Pick<ThemeColors, "bg" | "fg" | "accent"> & Partial<ThemeColors>;
  shadows?: Partial<ThemeShadows>;
};

export type ThemeConfig = {
  /** Theme id used when the resolved mode is light. */
  light: string;
  /** Theme id used when the resolved mode is dark. */
  dark: string;
  defaultMode: "light" | "dark" | "system";
  allowToggle: boolean;
  typography: {
    body: "serif" | "sans";
    ui: "sans" | "serif";
    code: "mono";
    /**
     * Justified prose. Applies to paragraphs and list items in the homepage
     * bio, custom pages, and article bodies only; a page's `article.justify`
     * frontmatter overrides `enabled`.
     */
    justify: {
      enabled: boolean;
      /** Add `hyphens: auto`, which keeps justified lines from opening rivers. */
      hyphenate: boolean;
      /** "all" justifies at every width; "tablet" leaves phones ragged-right. */
      minWidth: JustifyMinWidth;
    };
  };
  layout: {
    /**
     * Site-wide page width in px, including the 32px desktop gutters. The
     * header, footer, homepage, and topic list share it, so every page has the
     * same edges. The default 1020 is 660 (bio measure) + 56 (gap) + 240
     * (hero photo) + 2 × 32.
     */
    contentWidth: number;
  };
  /** Site-wide `<HoverNote>` look; a page's `hoverNotes` frontmatter and a note's own props override it. */
  hoverNotes: {
    marker: HoverNoteMarker;
    appearance: HoverNoteAppearance;
  };
  /** Site-wide `<Term>` look; a page's `terms` frontmatter and a term's own props override it. */
  terms: {
    underline: TermUnderline;
  };
};

export type JustifyMinWidth = "all" | "tablet";

/** "superscript" raises the mark; "bracket" sets it on the line as `[1]`. */
export type HoverNoteMarker = "superscript" | "bracket";
/** "card" uses the page palette; "inverted" reverses it. */
export type HoverNoteAppearance = "card" | "inverted";
/** "dotted" draws a soft dotted underline under a `<Term>`; "none" leaves just the annotation colour. */
export type TermUnderline = "dotted" | "none";

export type RecentWritingSelect = "featured-first" | "recent" | "featured";

export type PublicationsConfig = {
  source: string;
  /**
   * One line under the publications page's title, and the page's meta
   * description. Empty hides the line.
   */
  description?: string;
  grouping: {
    by: "year";
    order: "asc" | "desc";
  };
  authorHighlight: readonly string[];
  bibtex: {
    showButtonField: string;
  };
  abstractDisplay: PublicationAbstractDisplay;
  /** Typeset `$…$` and `\(…\)` in abstracts with KaTeX; `false` prints them as written. */
  abstractMath: boolean;
  previews: {
    enabled: boolean;
    basePath: string;
  };
};

/**
 * Whether readers can rearrange a graph by dragging its nodes, and what a drop
 * does next.
 *
 *   "none"     — nodes are fixed. Panning and zooming still work.
 *   "stays"    — a dropped node keeps where it was put, and nothing else moves.
 *   "resettle" — as "stays", but the layout re-runs afterwards so the
 *                neighbours make room. Livelier, at the cost of a whole-graph
 *                recalculation on every drop.
 *
 * Both draggable modes pin on release: a mode that handed the node straight
 * back to the forces would look like the drag had been refused.
 */
export type DragMode = "none" | "stays" | "resettle";

/**
 * Which titles appear while a node is hovered.
 *   "node"       — the hovered node's own title.
 *   "neighbours" — the hovered node's and every page it links with.
 *   "none"       — no titles; the highlight alone.
 * Types whose `labelVisibility` is "always" (hubs) are named regardless.
 */
export type GraphHoverLabels = "node" | "neighbours" | "none";

/**
 * How the selected node is marked.
 *   "halo" — a translucent disc in the node's own colour around the glyph.
 *   "ring" — a thin dark ring around the glyph.
 * Either way the selected node's edges are drawn in the accent colour.
 */
export type GraphSelectionStyle = "halo" | "ring";

export type GraphHoverConfig = {
  labels: GraphHoverLabels;
  /** Fade everything outside the hovered node's neighbourhood. */
  dim: boolean;
};

/**
 * The forces behind the "cluster" layout. Distances are in layout units, which
 * are roughly screen pixels before the map is zoomed to fit; strengths are
 * fractions, and a larger one pulls harder.
 */
export type GraphForcesConfig = {
  /** How hard hubs push everything away. Larger spreads the groups apart. */
  hubRepulsion: number;
  /** How hard every other page pushes its neighbours away. */
  entryRepulsion: number;
  /** Beyond this distance two nodes stop pushing on each other. */
  repulsionRange: number;
  /**
   * How hard hubs push one another apart, on top of `hubRepulsion`. Acts only
   * between hubs, so it spreads the topics without loosening their groups.
   */
  hubHubRepulsion: number;
  /** Beyond this distance two hubs stop pushing on each other. */
  hubHubRange: number;
  /** How far a page sits from the hub whose folder it lives in. */
  groupDistance: number;
  /** How firmly pages are held at that distance from their hub (0–1). */
  groupPull: number;
  /** Length of a link between two pages of the same group. */
  linkLength: number;
  /** Length of a link between pages of different groups. */
  crossLinkLength: number;
  /** How much a link between groups draws them together (0–1). */
  crossLinkStrength: number;
  /**
   * Length of a link between a hub and a page outside its folder: how a hub
   * gathers the pages it lists when they do not live under it.
   */
  hubLinkLength: number;
  /** How firmly such a link holds the page to the hub (0–1). */
  hubLinkStrength: number;
  /** Clear space kept between any two glyphs. */
  minGap: number;
  /** How firmly everything is drawn toward the middle; keeps loose groups near the rest. */
  centerPull: number;
};

/**
 * Which edges carry arrowheads.
 *   "never"       — none; direction is read in the panel's connection list.
 *   "always"      — every edge.
 *   "highlighted" — only the edges of the hovered or selected node, so the
 *                   map stays quiet until the reader asks about one node.
 */
export type GraphArrows = "never" | "always" | "highlighted";

export type GraphConfigBase = {
  colorBy: "type";
  links: {
    color: string;
    width: number;
    opacity: number;
    /** How far an edge bows, as a fraction of its length. 0 draws straight lines. */
    curvature: number;
    /** Which edges carry arrowheads. Unset, `directed` decides (true = "always"). */
    arrows?: GraphArrows;
    /** The older switch for arrowheads, kept for existing configs; `arrows` wins. */
    directed: boolean;
    arrow: {
      /** Head length along the edge, in screen pixels at the default edge width. */
      length: number;
      /** Head half-width, so a head is twice this across. */
      width: number;
      relPos: number;
      color: "edge" | string;
    };
  };
  layout: {
    hubs: "cluster" | "circle" | "row" | "force";
    labels: "config" | "all" | "none";
    labelSide: "top" | "bottom" | "auto";
    /** Used by the "cluster" layout. */
    forces: GraphForcesConfig;
  };
  /**
   * What hovering a node does on the writing map and the per-entry maps. The
   * homepage map takes its own overrides from
   * `site.homepage.writingPreview.hover`.
   */
  hover: GraphHoverConfig;
  selection: { style: GraphSelectionStyle };
  interaction: {
    /**
     * Applies to the writing browser and the per-entry local maps. The
     * homepage preview is decorative and never draggable.
     */
    drag: DragMode;
  };
};

export type GraphConfig = GraphConfigBase & {
  nodeTypes: Record<EntryType, EntryTypeGraphConfig>;
};

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type SiteConfigOverrides = {
  site?: DeepPartial<SiteConfig>;
  theme?: DeepPartial<ThemeConfig>;
  publications?: DeepPartial<PublicationsConfig>;
  graph?: DeepPartial<GraphConfigBase>;
  writing?: DeepPartial<Omit<WritingConfig, "entryTypes">>;
  entryTypes?: readonly EntryTypeDefinition[];
};
