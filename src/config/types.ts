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
  backlinks: { where: PlacementNav };
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
  localGraph?: boolean;
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
    defaultView: {
      desktop: "map" | "topics" | "list";
      mobile: "map" | "topics" | "list";
    };
    urlState: boolean;
    focus: {
      mode: "dim" | "filter";
      depth: 1 | 2;
    };
    mobile: {
      graphPlacement: "collapsed";
      defaultPreviewMode: "cards";
    };
    topics: TopicsConfig;
    list: ListConfig;
  };
  entryLayout: {
    mode: {
      default: ArticleMode;
      byType: Record<EntryType, ArticleMode>;
    };
    localGraph: {
      enabled: boolean;
      defaultDepth: number;
      maxNodes: number;
      mobile: "collapsed";
      byType: Record<EntryType, boolean>;
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

export type ThemeConfig = {
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
