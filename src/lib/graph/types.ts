import type { EntryType } from "../../config/writing";

export type { EntryType };

export type ArticleLayout = "narrow" | "distill" | "wide";

export type EntryNode = {
  id: string;
  slug: string;
  title: string;
  type: EntryType;
  tags: string[];
  summary?: string;
  date?: string;
  updated?: string;
  url: string;
  draft?: boolean;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type GraphIndex = {
  nodes: EntryNode[];
  edges: GraphEdge[];
  backlinks: Record<string, string[]>;
  outgoing: Record<string, string[]>;
  hubs: EntryNode[];
};

export type WikilinkMatch = {
  raw: string;
  target: string;
  label: string;
};

export type ResolvedReference = {
  input: string;
  target?: EntryNode;
  reason?: "unresolved";
};

export type GraphWarning = {
  type:
    | "duplicate-slug"
    | "unresolved-wikilink"
    | "unresolved-frontmatter-link"
    | "missing-summary"
    | "empty-graph"
    | "preview-too-large";
  entry?: string;
  target?: string;
  message: string;
};

export type GraphBuildResult = {
  index: GraphIndex;
  warnings: GraphWarning[];
};

export type WritingBrowserState = {
  view: "map" | "topics" | "list";
  focus?: string;
  selected?: string;
  query?: string;
  types?: EntryType[];
  tags?: string[];
};

export type WritingSearchDocument = {
  id: string;
  title: string;
  summary?: string;
  tags: string[];
  type: EntryType;
  date?: string;
  url: string;
};

export type WritingEntryLike = {
  id: string;
  body?: string;
  data: {
    title: string;
    type: EntryType;
    slug?: string;
    aliases?: string[];
    date?: string;
    updated?: string;
    summary?: string;
    tags?: string[];
    links?: string[];
    draft?: boolean;
    theme?: "global" | "system" | "light" | "dark";
    external?: Record<string, string | undefined>;
    layout?: {
      sidebar?: boolean;
      localGraph?: boolean;
      toc?: boolean;
      placement?: {
        toc?: { where?: "sidebar" | "none"; style?: "strip" | "text" };
        localGraph?: { where?: "header" | "footer" | "none" };
        backlinks?: { where?: "footer" | "sidebar" | "none" };
        related?: { where?: "footer" | "sidebar" | "none" };
      };
    };
  };
};

export type EntryRecord<TEntry extends WritingEntryLike = WritingEntryLike> = {
  entry: TEntry;
  node: EntryNode;
  aliases: string[];
  body: string;
};
