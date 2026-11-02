import * as Plot from "@observablehq/plot";
import { DASH, NEUTRAL, SERIES, SERIES_ALT, defineFigure } from "../../../lib/figures";

// Starter example: three series over training steps, with a band around
// the first two. Replace it with your own (see docs/figures.md).
const COLORS: Record<string, string> = {
  "Model A": SERIES[0],
  "Model A, variant": SERIES_ALT[0],
  Baseline: NEUTRAL
};

export default defineFigure({
  data: "entry-4/example-curves.csv",
  size: "medium",
  alt: "Example score against step for Model A, its variant and a baseline. Both models rise and level off; the baseline stays low.",
  legend: [
    { label: "Model A", color: SERIES[0], key: "line" },
    { label: "Model A, variant", color: SERIES_ALT[0], key: "line", dashed: true },
    { label: "Baseline", color: NEUTRAL, key: "line" }
  ],
  plot: ({ data, width, compact }) => ({
    width,
    height: compact ? 240 : 280,
    x: { label: "Step", ticks: compact ? 5 : 10 },
    y: { label: "Example score $s_t$", domain: [0, 1] },
    marks: [
      Plot.gridY({ ticks: 5 }),
      Plot.areaY(
        data.filter((d) => d.series !== "Baseline"),
        { x: "step", y1: "low", y2: "high", fill: (d) => COLORS[d.series] }
      ),
      // Plot takes one dash per mark, so the dashed variant is its own line.
      ...["Model A", "Model A, variant", "Baseline"].map((series) =>
        Plot.lineY(
          data.filter((d) => d.series === series),
          {
            x: "step",
            y: "score",
            stroke: COLORS[series],
            strokeDasharray: series === "Model A, variant" ? DASH : undefined,
            strokeWidth: 1.5
          }
        )
      ),
      Plot.dot(data, {
        x: "step",
        y: "score",
        fill: (d) => COLORS[d.series],
        r: 2.5,
        title: (d) => `${d.series}\nstep ${d.step}: ${d.score.toFixed(2)}`
      })
    ]
  })
});
