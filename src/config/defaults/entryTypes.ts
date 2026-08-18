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
      size: 18,
      color: "var(--graph-hub)",
      labelVisibility: "always"
    },
    article: {
      localGraph: true,
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
      size: 10,
      color: "var(--graph-sub-hub)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true,
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
      size: 12,
      color: "var(--graph-paper)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true,
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
      size: 10,
      color: "var(--graph-post)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true,
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
      size: 9,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true
    }
  },
  {
    id: "teaching",
    label: "Teaching note",
    role: "entry",
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "diamond",
      size: 11,
      color: "var(--graph-teaching)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: false,
      placement: {
        toc: { where: "none" }
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
      size: 11,
      color: "var(--graph-project)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true
    }
  }
] as const satisfies readonly EntryTypeDefinition[];
