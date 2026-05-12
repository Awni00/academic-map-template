export const graphConfig = {
  colorBy: "type",
  nodeTypes: {
    hub: {
      label: "Hub",
      shape: "square",
      size: 18,
      color: "var(--graph-hub)",
      labelVisibility: "always"
    },
    paper: {
      label: "Paper",
      shape: "circle",
      size: 12,
      color: "var(--graph-paper)",
      labelVisibility: "hover"
    },
    post: {
      label: "Post",
      shape: "circle",
      size: 10,
      color: "var(--graph-post)",
      labelVisibility: "hover"
    },
    note: {
      label: "Note",
      shape: "circle",
      size: 9,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    },
    teaching: {
      label: "Teaching",
      shape: "diamond",
      size: 11,
      color: "var(--graph-teaching)",
      labelVisibility: "hover"
    },
    project: {
      label: "Project",
      shape: "hexagon",
      size: 11,
      color: "var(--graph-project)",
      labelVisibility: "hover"
    }
  },
  links: {
    color: "var(--graph-edge)",
    width: 1,
    opacity: 0.4
  }
} as const;
