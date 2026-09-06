import type { GraphConfigBase } from "../types";

export const defaultGraphConfig = {
  colorBy: "type",
  links: {
    color: "var(--graph-edge)",
    width: 1,
    opacity: 0.4,
    directed: true,
    arrow: {
      length: 4,
      width: 2,
      relPos: 1.0,
      color: "edge"
    }
  },
  layout: {
    hubs: "circle",
    labels: "config",
    labelSide: "auto"
  },
  interaction: {
    // Dropped nodes stay put, and the rest of the layout is left alone: a
    // reader who moves one node is answering "where should this sit", not
    // asking for a new map.
    drag: "stays"
  }
} as const satisfies GraphConfigBase;
