import type { BundledTheme } from "shiki";

export type EntryType = string;

export type EntryTypeRole = "hub" | "section" | "entry";
export type GraphNodeShape = "circle" | "square" | "diamond" | "hexagon";
export type LabelVisibility = "always" | "hover" | "never";

export type PlacementToc = "left" | "right" | "none";
export type PlacementGraph = "header" | "footer" | "none";
export type PlacementNav = "left" | "right" | "footer" | "none";
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
  linkedFrom: { where: PlacementNav };
  related: { where: PlacementNav };
};

export type EntryTypeGraphConfig = {
  shape: GraphNodeShape;
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
  placement?: Partial<PlacementSpec>;
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
  showTypeFilter: boolean;
  defaultSort: TopicsSort;
  sortOptions: readonly TopicsSortField[];
};

export type WritingConfig = {
  route: string;
  label: string;
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
    hubPages: {
      autoRenderLinkedEntries: boolean;
      groupLinkedEntriesBy: "type";
    };
    toc: {
      default: TocConfig;
      byType: Record<EntryType, TocConfigOverride>;
    };
    placement: {
      default: PlacementSpec;
      byType: Record<EntryType, Partial<PlacementSpec>>;
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

export type SiteConfig = {
  title: string;
  name: string;
  role: string;
  affiliation: string;
  description: string;
  url: string;
  profileImage: string;
  ogImage: string;
  links: Record<string, string>;
  nav: readonly { label: string; href: string }[];
  homepage: {
    hero: { enabled: boolean };
    researchSummary: { enabled: boolean; source: string };
    writingPreview: {
      enabled: boolean;
      desktopMode: "graph" | "topic-cards";
      mobileMode: "graph" | "topic-cards";
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
      maxItems: number;
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
 * fills omitted ones with `color-mix()` expressions derived from the core.
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
  "graph-hub": string;
  "graph-sub-hub": string;
  "graph-paper": string;
  "graph-post": string;
  "graph-note": string;
  "graph-teaching": string;
  "graph-project": string;
  "graph-edge": string;
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
  };
};

export type PublicationsConfig = {
  source: string;
  grouping: {
    by: "year";
    order: "asc" | "desc";
  };
  authorHighlight: readonly string[];
  bibtex: {
    showButtonField: string;
  };
  abstractDisplay: PublicationAbstractDisplay;
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

export type GraphConfigBase = {
  colorBy: "type";
  links: {
    color: string;
    width: number;
    opacity: number;
    directed: boolean;
    arrow: {
      length: number;
      width: number;
      relPos: number;
      color: "edge" | string;
    };
  };
  layout: {
    hubs: "circle" | "row" | "force";
    labels: "config" | "all" | "none";
    labelSide: "top" | "bottom" | "auto";
  };
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
