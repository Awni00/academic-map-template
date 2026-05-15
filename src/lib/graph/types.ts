import type { EntryType } from "../../config/writing";

export type { EntryType };

export type ArticleWidth = "reading" | "flex";

export type EntryNode = {
  id: string;
  path: string;
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
  reason?: "unresolved" | "ambiguous";
  candidates?: EntryNode[];
};

export type GraphWarning = {
  type:
    | "duplicate-path"
    | "duplicate-alias"
    | "alias-path-collision"
    | "reserved-path"
    | "root-writing-index"
    | "unresolved-wikilink"
    | "unresolved-frontmatter-link"
    | "ambiguous-reference"
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
  filePath?: string;
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
    authors?: Array<
      | string
      | {
          name: string;
          affiliation?: string;
          url?: string;
          note?: string;
        }
    >;
    draft?: boolean;
    theme?: "global" | "system" | "light" | "dark";
    external?: Record<string, string | undefined>;
    layout?: {
      width?: "reading" | "flex";
      asides?: "margin" | "inline";
      placement?: {
        toc?: { where?: "left" | "right" | "sidebar" | "none" };
        localGraph?: { where?: "header" | "footer" | "none" };
        backlinks?: { where?: "left" | "right" | "footer" | "sidebar" | "none" };
        related?: { where?: "left" | "right" | "footer" | "sidebar" | "none" };
      };
    };
  };
};

export type EntryRecord<TEntry extends WritingEntryLike = WritingEntryLike> = {
  entry: TEntry;
  node: EntryNode;
  aliases: string[];
  body: string;
  sourceDir: string;
};
