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
    opacity: 0.4,
    /**
     * When true, edges are drawn with an arrowhead at the target end.
     * Edges are already stored as directed (source → target) in the graph
     * index; this only controls rendering.
     */
    directed: true,
    arrow: {
      /** Arrowhead length in canvas units. */
      length: 4,
      /** Arrowhead half-width (controls how wide the triangle is). */
      width: 2,
      /**
       *  1.0 — tip at the target node boundary (default).
       *  0.5 — tip at edge midpoint (useful for dense graphs).
       */
      relPos: 1.0,
      /**
       * `"edge"` reuses the line color; any CSS value (including
       * `var(--…)`) overrides it.
       */
      color: "edge" as "edge" | string
    }
  },
  /**
   * Layout + label controls for the writing-map view. The per-entry
   * LocalGraph in the article sidebar always uses `hubs: "force"` and
   * `labels: "none"` regardless of this section.
   */
  layout: {
    /**
     *  "force"  — fully force-directed (legacy; hubs float).
     *  "circle" — hubs pinned evenly on a circle around the centre.
     *  "row"    — hubs pinned along a horizontal line near the top.
     */
    hubs: "circle" as "circle" | "row" | "force",
    /**
     * Which painted labels to draw on the canvas.
     *  "config" — honour each node type's `labelVisibility` field below
     *             ("always" → painted, "hover" → not painted; the library's
     *             built-in hover tooltip still shows on mouseover).
     *  "all"    — paint every node's label regardless of type.
     *  "none"   — paint no labels.
     */
    labels: "config" as "config" | "all" | "none",
    /**
     * Side relative to a node where its label is drawn.
     *  "top"    — always above.
     *  "bottom" — always below.
     *  "auto"   — derived from the hub layout (upper hubs above, lower
     *             hubs below for "circle"; above for "row"/"force").
     */
    labelSide: "auto" as "top" | "bottom" | "auto"
  }
} as const;
