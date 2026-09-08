import type { GraphConfigBase } from "../types";

export const defaultGraphConfig = {
  colorBy: "type",
  links: {
    color: "var(--graph-edge)",
    width: 1,
    // 0.35, not the 0.4 this used to claim: the canvas hardcoded 0.35 and
    // never read this field, so the number here was decorative and wrong.
    opacity: 0.35,
    directed: true,
    arrow: {
      // `length` along the edge, `width` out to each side — so a head is
      // `2 * width` across. Slimmer than it is long, or it reads as a wedge.
      length: 5,
      width: 1.5,
      // Fraction of the span between the two glyph edges. 1 puts the tip at
      // the target's boundary; lower values slide it back along the edge.
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
