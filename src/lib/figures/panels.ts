import * as Plot from "@observablehq/plot";
import type { FigureRow } from "./index";

/**
 * Small multiples whose panels each keep their own x and y range, like
 * plotly subplots. Plot facets share one scale, so data are mapped to [0, 1]
 * within their panel, and the panel's ticks, grid, labels and frame are drawn
 * as faceted marks.
 */

export type Panel = {
  key: string;
  x: [number, number];
  xTicks: number[];
  y: [number, number];
  yTicks: number[];
};

/** Round tick values, like d3.ticks. */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

/** Fixed-precision format matching a tick list's step. */
export function tickFormat(ticks: number[]): (v: number) => string {
  let digits = 0;
  while (digits < 6 && !ticks.every((t) => Math.abs(t * 10 ** digits - Math.round(t * 10 ** digits)) < 1e-6)) digits++;
  return (v) => v.toFixed(digits);
}

type GridOptions = {
  panels: Panel[];
  columns: number;
  /** Field of each row naming its panel. */
  panelOf: (d: FigureRow) => string;
  xFormat: (v: number) => string;
  yFormat: (panel: Panel) => (v: number) => string;
  /** Draw y tick labels only in the first column (when every panel has the same y). */
  yLabelsFirstColumnOnly?: boolean;
  /** Draw x tick labels only on the lowest panel of each column (when every panel has the same x). */
  xLabelsBottomOnly?: boolean;
  xLabel: string;
  yLabel: string;
  /** Vertical offsets below the frame, px. */
  xTickOffset?: number;
  xLabelOffset?: number;
  /** Distance of the y title left of the frame, px. */
  yLabelOffset?: number;
};

export function panelGrid(options: GridOptions) {
  const { panels, columns, panelOf, xFormat, yFormat } = options;
  const index = new Map(panels.map((p, i) => [p.key, i]));
  const byKey = new Map(panels.map((p) => [p.key, p]));
  const col = (key: string) => index.get(key)! % columns;
  const row = (key: string) => Math.floor(index.get(key)! / columns);
  const rows = Math.ceil(panels.length / columns);
  const hasPanelBelow = (key: string) => index.get(key)! + columns < panels.length;

  const facet = (key: (d: any) => string) => ({ fx: (d: any) => col(key(d)), fy: (d: any) => row(key(d)) });
  const nx = (key: string, v: number) => {
    const [lo, hi] = byKey.get(key)!.x;
    return (v - lo) / (hi - lo);
  };
  const ny = (key: string, v: number) => {
    const [lo, hi] = byKey.get(key)!.y;
    return (v - lo) / (hi - lo);
  };

  const yTicks = panels.flatMap((p) =>
    p.yTicks.map((v) => ({ key: p.key, v: ny(p.key, v), label: yFormat(p)(v), first: col(p.key) === 0 }))
  );
  const xTicks = panels.flatMap((p) =>
    p.xTicks.map((v) => ({ key: p.key, v: nx(p.key, v), label: xFormat(v), bottom: !hasPanelBelow(p.key) }))
  );
  const byPanel = facet((d) => d.key);
  const xTickOffset = options.xTickOffset ?? 6;
  const xLabelOffset = options.xLabelOffset ?? 36;

  // Axis marks given explicit data, so they carry Plot's axis aria-labels
  // (and so the site's axis styles); facetAnchor: null keeps them in every panel.
  const marks: Plot.Markish[] = [
    Plot.gridY(yTicks, { y: "v", ...byPanel }),
    Plot.axisY(options.yLabelsFirstColumnOnly ? yTicks.filter((t) => t.first) : yTicks, {
      y: "v",
      text: "label",
      ...byPanel,
      ariaLabel: "y-axis",
      anchor: "left",
      facetAnchor: null,
      tickSize: 0,
      label: null,
      tickPadding: 6
    }),
    Plot.axisX(options.xLabelsBottomOnly ? xTicks.filter((t) => t.bottom) : xTicks, {
      x: "v",
      text: "label",
      ...byPanel,
      ariaLabel: "x-axis",
      anchor: "bottom",
      facetAnchor: null,
      tickSize: 0,
      label: null,
      tickPadding: xTickOffset
    }),
    Plot.frame({ anchor: "bottom" }),
    Plot.axisX(panels, {
      x: () => 0.5,
      text: "key",
      ...byPanel,
      ariaLabel: "fx-axis",
      anchor: "top",
      facetAnchor: null,
      tickSize: 0,
      label: null,
      tickPadding: 6
    }),
    // Axis titles, once for the whole grid, centred in the plot margins.
    Plot.axisX({ ticks: [], label: options.xLabel, labelAnchor: "center", labelArrow: "none", labelOffset: xLabelOffset }),
    Plot.axisY({ ticks: [], label: options.yLabel, labelAnchor: "center", labelArrow: "none", labelOffset: options.yLabelOffset ?? 40 })
  ];

  return {
    fx: { domain: [...Array(columns).keys()], axis: null },
    fy: { domain: [...Array(rows).keys()], axis: null },
    x: { domain: [0, 1], axis: null },
    y: { domain: [0, 1], axis: null },
    facet: (d: FigureRow) => ({ fx: col(panelOf(d)), fy: row(panelOf(d)) }),
    fxOf: (d: FigureRow) => col(panelOf(d)),
    fyOf: (d: FigureRow) => row(panelOf(d)),
    nx: (d: FigureRow, v: number) => nx(panelOf(d), v),
    ny: (d: FigureRow, v: number) => ny(panelOf(d), v),
    marks
  };
}
