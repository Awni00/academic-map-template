import type { GraphConfigBase } from "../types";

export const defaultGraphConfig = {
  colorBy: "type",
  links: {
    color: "var(--graph-edge)",
    width: 1,
    // Fainter than a bare line could afford, because a hovered or selected
    // node lifts its own edges to the accent colour on top of this.
    opacity: 0.55,
    // Off by default. At map scale an arrowhead is a few pixels of noise piled
    // up at every hub; direction is stated in the panel's connection rows
    // instead, where it can be read. Sites that want it on the canvas can
    // turn it back on, and get the arrowed edges this used to draw.
    directed: false,
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
    // Entries gather around the hub whose folder they live in, and the hubs
    // find their own places. See src/lib/graph/clusterLayout.ts.
    hubs: "cluster",
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
