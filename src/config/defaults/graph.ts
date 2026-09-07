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
    // Dropped nodes stay put and the layout re-settles around them, so moving
    // one node reads as rearranging a live thing rather than parking a sticker
    // on a still image. Sites that want the cheaper, stiller behaviour can set
    // "stays"; see docs/configuration.md.
    drag: "resettle"
  }
} as const satisfies GraphConfigBase;
