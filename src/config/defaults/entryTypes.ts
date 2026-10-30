import type { EntryTypeDefinition } from "../types";

export const defaultEntryTypes = [
  {
    id: "hub",
    label: "Hub",
    role: "hub",
    ownsFolder: true,
    includeInRss: false,
    includeInRecent: false,
    graph: {
      shape: "square",
      size: 20,
      color: "var(--graph-hub)",
      labelVisibility: "always"
    },
    article: {
      placement: {
        toc: { where: "none" },
        localGraph: { where: "header" }
      }
    }
  },
  {
    id: "sub-hub",
    label: "Sub-hub",
    role: "section",
    ownsFolder: true,
    includeInRss: false,
    includeInRecent: false,
    graph: {
      shape: "square",
      size: 13,
      color: "var(--graph-sub-hub)",
      labelVisibility: "hover"
    },
    article: {
      placement: {
        toc: { where: "none" },
        localGraph: { where: "header" }
      }
    }
  },
  {
    id: "paper",
    label: "Paper",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "circle",
      size: 16,
      color: "var(--graph-paper)",
      labelVisibility: "hover"
    },
    article: {
      asides: "margin"
    }
  },
  {
    id: "post",
    label: "Post",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "circle",
      size: 14,
      color: "var(--graph-post)",
      labelVisibility: "hover"
    },
    article: {
      asides: "margin"
    }
  },
  {
    id: "note",
    label: "Note",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "circle",
      size: 13,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    },
  },
  {
    id: "teaching",
    label: "Teaching note",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "diamond",
      size: 16,
      color: "var(--graph-teaching)",
      labelVisibility: "hover"
    },
    article: {
      placement: {
        toc: { where: "none" },
        localGraph: { where: "none" }
      }
    }
  },
  {
    id: "project",
    label: "Project",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "hexagon",
      size: 16,
      color: "var(--graph-project)",
      labelVisibility: "hover"
    },
  }
] as const satisfies readonly EntryTypeDefinition[];
