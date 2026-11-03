# Figures

`<Chart>` and `<Diagram>` draw figures when the site builds and inline them
as SVG. They ship no JavaScript beyond a small script for hover tips and
play-once animation (plus a chart's own module, if it is interactive), use
the page's fonts, recolour with the theme toggle, and swap to a phone layout on
narrow screens.

- **Charts** are drawn with [Observable Plot](https://observablehq.com/plot/)
  from a data file.
- **Diagrams** (automata, set pictures, block diagrams) are drawn with a small
  SVG canvas in the same palette, type and line weights as the charts.

Entry 4 of the starter content uses one of each: see
`src/site/figures/entry-4/`, `src/site/diagrams/entry-4/` and
`src/data/figures/entry-4/`.

## Where things live

Data, figure code and shared style are kept apart, so any one can change
without the others.

| What                  | Where                                                  | Owner    |
| --------------------- | ------------------------------------------------------ | -------- |
| Data and provenance   | `src/data/figures/<post>/` (`*.csv`, `provenance.yaml`) | site     |
| Chart definition      | `src/site/figures/<post>/<name>.ts`                    | site     |
| Interactive behaviour | `src/site/figures/<post>/<name>.client.ts` (optional)  | site     |
| Diagram definition    | `src/site/diagrams/<post>/<name>.ts`                   | site     |
| Review entries        | `src/site/figure-review/<post>.ts`                     | site     |
| Colours               | theme roles `figure-*` (see [Theming](theming.md#chart-colours)) | template, overridable |
| Rendering and style   | `src/lib/figures/`, `src/styles/figures.css`, `src/components/article/{Chart,Diagram,FigureFrame,FigureLegend}.astro` | template |
| PDF tools             | `scripts/figures/`                                     | template |

`<post>` is the post's slug. Files whose name starts with `_` are ignored as
definitions, so shared helpers for one post's figures can sit beside them
(`_series.ts`).

## Adding a chart

1. Put the data in `src/data/figures/<post>/<name>.csv`, and describe where it
   came from in that folder's `provenance.yaml` (below).
2. Write a definition in `src/site/figures/<post>/<name>.ts`:

   ```ts
   import * as Plot from "@observablehq/plot";
   import { NEUTRAL, SERIES, defineFigure } from "../../../lib/figures";

   export default defineFigure({
     data: "my-post/loss.csv",
     size: "medium",
     alt: "Training loss against step for the model and a baseline.",
     legend: [
       { label: "Model", color: SERIES[0], key: "line" },
       { label: "Baseline", color: NEUTRAL, key: "line" }
     ],
     plot: ({ data, width, compact }) => ({
       width,
       height: compact ? 220 : 260,
       x: { label: "Step" },
       y: { label: "Loss $\\mathcal{L}$" },
       marks: [
         Plot.gridY(),
         Plot.lineY(data, {
           x: "step",
           y: "loss",
           stroke: (d) => (d.run === "baseline" ? NEUTRAL : SERIES[0]),
           z: "run",
           title: (d) => `${d.run}, step ${d.step}: ${d.loss}`
         })
       ]
     })
   });
   ```

3. Use it in the post:

   ```mdx
   <Chart figure="my-post/loss" caption="Loss falls faster than the baseline's." />
   ```

`figure` is the definition's path under `src/site/figures/`, without `.ts`.
`alt` overrides the definition's alt text, `size` its size preset. For a
caption with math or links, use `<Fragment slot="caption">…</Fragment>`.
Inside a `<FigureGrid>`, a `<Chart>` is one cell, like a `<Figure>`.

CSV rows are parsed with d3's `autoType`, so numbers arrive as numbers.
Quote a field that contains a comma.

### The definition

| Field    | What it does |
| -------- | ------------ |
| `data`   | Path under `src/data/figures/`. |
| `size`   | `narrow` 360px, `medium` 560px or `full` 760px: the width it is drawn at, and its widest display. |
| `alt`    | Default alt text. `$…$` is stripped to its source for screen readers. |
| `title`  | A small panel title above the plot. Use it only when the figure has one. |
| `legend` | Legend items, drawn below the plot (below). |
| `mono`   | `["x" \| "fx" \| "legend"]`: set those parts in the code face, for identifiers. |
| `plot`   | `({ data, width, compact }) => Plot options`. |

**Phone layout.** A medium or full chart is drawn a second time at 360px with
`compact: true`, and that drawing replaces the wide one when its column is
520px or narrower. It is never stretched past 360px: in a column between the
two it sits centred, so its type keeps the size it was set at. Branch on
`compact` to drop ticks, shorten labels or change the height. Narrow charts
already fit a phone column and have no phone layout.

### Conventions

- **Colour.** `SERIES[0]` … `SERIES[5]` in fixed order, never cycled; the
  post's own method takes `SERIES[0]`. Baselines, "other" groups and reference
  lines take `NEUTRAL`. A seventh series means folding some into `NEUTRAL` or
  using small multiples. In a scatter plot, where any two colours can touch,
  use at most the first three. The order is what keeps neighbours apart for
  colour-blind readers; see [Theming](theming.md#chart-colours).
- **Companion shades.** `SERIES_ALT[i]` is a second shade of `SERIES[i]`, for
  a series closely tied to another (a model and its ablation). Pair it with a
  dash (`DASH`) so it does not rely on lightness alone.
- **Secondary encoding** is a dash (`strokeDasharray: DASH`), never a second
  colour scale. Plot takes one dash per mark, so draw the dashed series as its
  own mark.
- **Ink, grid, axes and type** come from `figures.css`. Definitions don't set
  colours for text or axes, or font sizes.
- **Legend** comes from `legend`, not Plot's `legend: true`. Keys: `line`
  (with `dashed: true` or a dash pattern such as `"1.5,3"`), `swatch`, `dot`,
  and for diagrams `region` and `arrow`. An ordinal or sequential key is
  `{ key: "ramp", label, color, opacities, from, to }`. With four series or
  fewer, direct labels (`Plot.text`) are fine instead, if they don't collide.
- **Hover.** Give data marks a `title` channel; it becomes the hover tip.
- **Error bars.** A rule mark with `className: ERROR_BAR`. A zero baseline:
  `Plot.ruleY([0], { className: BASELINE })`. Area marks (bands) are drawn at
  the theme's band opacity.
- **Math.** Axis labels, legend labels and panel titles may carry TeX between
  `$…$` (a `$` followed by a digit is a dollar amount, not math), rendered with KaTeX at build time with the site's global macros
  (`src/site/math.ts`). Tick labels and hover tips stay plain text. Charts
  redrawn in the browser (`.client.ts`) don't render TeX.
- **Axis labels** are centred on their axis, the y label rotated, and the
  margins widen to fit (`withSiteDefaults`). Set `labelAnchor` to opt out.
- **Log axes.** `tickFormat: powerOfTen` prints 10⁻², 10⁻¹, 10⁰.
- **Line weights.** Plot's lines default to 1.5px; legend line keys are drawn
  at 2px so they read at their small size.

### Small multiples with their own scales

Plot's facets share one scale. `panelGrid` in `src/lib/figures/panels.ts`
lays out panels that each keep their own x and y range: data are mapped to
[0, 1] within their panel, and each panel's ticks, grid, labels and frame are
drawn as faceted marks. `niceTicks` and `tickFormat` there pick round ticks.

Marks drawn by hand like this can take the class names `figure-tick-label`,
`figure-axis-label`, `figure-grid` and `figure-axis-line`, and are styled like
Plot's own.

### Interactive charts

A sibling `<name>.client.ts` makes a chart interactive. It mounts when the
chart scrolls near the viewport; the build-time SVG stays as the no-JS
fallback, so the definition must still draw a sensible static state.

```ts
import { defineFigureClient } from "../../../lib/figures";
import { renderFigureInBrowser } from "../../../lib/figures/client";

export default defineFigureClient((root, { data }) => {
  const plot = root.querySelector(".figure-chart__plot")!;
  const draw = (step: number) =>
    plot.replaceChildren(renderFigureInBrowser({ /* Plot options */ }, "Alt text"));
  // Add labelled controls to `root` and call `draw` when they change.
});
```

- `data` is the definition's CSV, parsed. Larger data can be imported by the
  client module itself, so it only loads with that figure.
- `renderFigureInBrowser` applies the same defaults and theme colours as the
  build-time renderer.
- Controls use the site's tokens (`--font-ui`, `--color-*`), have labels,
  work with the keyboard, and don't autoplay under `prefers-reduced-motion`.

## Adding a diagram

A definition in `src/site/diagrams/<post>/<name>.ts`:

```ts
import { canvas, defineDiagram } from "../../../lib/figures/diagram";

export default defineDiagram({
  size: "medium",
  alt: "Two states, A and B, with a transition from A to B and a loop on B.",
  draw: ({ width, compact }) => {
    const a = { x: width * 0.3, y: 70, r: 22 };
    const b = { x: width * 0.7, y: 70, r: 22 };
    const c = canvas(width, 140);
    c.circle(a, a.r, { tone: 1 }).label(a, "A");
    c.circle(b, b.r, { tone: 2, double: true }).label(b, "B");
    const mid = c.edge(a, b, { bend: 20 });
    c.label(mid, "$x \\to y$", { size: "sm", baseline: "bottom" });
    c.loop(b, -90);
    return c;
  }
});
```

```mdx
<Diagram figure="my-post/states" caption="…" />
```

`draw({ width, compact })` returns a canvas from `canvas(width, height)`,
built up with:

| Helper | Draws |
| ------ | ----- |
| `circle(c, r, region)`, `rect(x, y, w, h, region)` | Regions. `double: true` adds an inner ring (an accepting state); `radius` rounds a rect. |
| `frame(x, y, w, h)` | A plot-style hairline box. |
| `dot(c, { tone, r })` | A filled dot. |
| `arrow(a, b)`, `line(a, b)` | Straight lines; `head`: `end` (default), `start`, `both`, `none`. |
| `edge(from, to, { bend })` | Node to node, trimmed at both outlines; `bend` in degrees curves it left of travel. Returns the midpoint, for a label. |
| `loop(node, angle, { spread, reach })` | A self-loop leaving and returning around `angle` (0 = right, 90 = down). Returns a point past its apex. |
| `label(at, text, options)` | Text; `anchor`, `baseline`, `size` (`sm` 12px, `md` 13px, `lg` 15px), `tone`, `halo`, `italic`. `$…$` renders with KaTeX. |
| `raw(svg)` | Raw SVG for anything else, such as a `<g class>` or a `<style>`. |

The definition takes `size`, `alt`, `title` and `legend` like a chart's, and
`animate` (below). A medium or full diagram is also drawn with
`compact: true` at 360px, like a chart, so it can rearrange for phones.

### Tones and fills

Shapes take a `tone`: a series slot `1`–`6`, `"neutral"`, `"ink"` (the text
colour, for arrows and outlines), `"muted"` (annotations) or `"inverse"`
(white, for text on a strong fill). Colour by role: give a slot to the things
the post's charts colour the same way, and `"neutral"` to everything else.

Regions take a `fill`:

- `"tint"` (default): an opaque tint of the tone, outlined in the tone, so
  overlapping regions stay distinct.
- `"solid"`: the tone itself.
- `"strong"`: a darker shade of the tone, with no outline, for labelled blocks
  and tokens. Put `tone: "inverse"` labels on it; the theme validator checks
  white text on every slot's strong fill.
- `"none"`: outline only.

### Line weights

Outlines, lines and arrows default to `STROKE.line` (1.25px); frames are
`STROKE.frame` (1px). `STROKE.emphasis` (2px) is there to pass as
`strokeWidth` for an outline that needs to stand out. Arrowheads are the
library's filled triangles; don't draw your own. Dashed regions use a 4,3
pattern, dashed lines the charts' `DASH`.

### Animation

`animate: { delay?: number }` makes a diagram play once. The static drawing
is the final frame, which is what readers without JavaScript or with reduced
motion see.

With motion allowed, the diagram gets `data-armed` on load, and `data-play`
once half of it, or half the viewport, is covered by it, after `delay` ms
(default 400). It plays once and stays on its final frame.

After the first play, a small icon-only Replay button appears inside the
drawing's box, in a corner, so it takes no space of its own. It is quiet at
rest and clearer on hover and focus, takes keyboard focus with a visible
ring, and is labelled "Replay animation". It never appears with reduced
motion or without JavaScript.

- `animate.replayCorner`: `"top-right"` (default), `"top-left"`,
  `"bottom-right"` or `"bottom-left"`. Pick a corner the drawing leaves
  empty; the button is 28px square.
- Whether it shows at all, highest precedence first:
  1. `<Diagram replay={false} />` (or `replay`) on the page;
  2. `animate: { replay: false }` in the definition;
  3. `writing.entryLayout.diagramReplay` in `src/site/config.ts` (default
     `true`).
 Write the
keyframes in a `raw("<style>…</style>")`, under
`.figure-diagram[data-play]`, with class names prefixed per diagram; hide the
first frame under `.figure-diagram[data-armed]:not([data-play])` so the final
frame doesn't flash first. `src/site/diagrams/entry-4/example-pipeline.ts`
does this.

## Provenance

Every data file in `src/data/figures/<post>/` has an entry in that folder's
`provenance.yaml`, so a later reader can tell where a number came from:

```yaml
paper: "<paper or post title>"
files:
  <file>.csv:
    figure: <which figure: the paper's label and/or the post's>
    used_by: src/site/figures/<post>/<name>.ts
    source:
      repo: <repo name>
      remote: <git remote URL>
      commit: <full hash of the source repo when read>
      commit_date: <ISO date of that commit>
      files:
        - path: <path within that repo>
          sha256: <hash of the file as read>
      generator: <script that produced the source data, or why there is none>
    extracted: <YYYY-MM-DD>
    method: copied | converted | vector-extracted | by-eye
    tool: <script or procedure used, for converted or vector-extracted>
    fidelity: <exact | exact to PDF precision | approximate …>
    notes: <anything a later reader needs>
```

A source outside any git repository (a PDF in a reference manager, a
download) sets `repo`, `remote` and `commit` to `none`, gives the file's
absolute `path` and `sha256`, and records what dates it in `created`.

Scripts that build one post's data belong in `scripts/figures/<post>/`
(site-owned in practice; the shared tools are the template's).

## Review page

Run the dev server and open `/fixtures/figures`. It shows every figure listed
in `src/site/figure-review/*.ts`, and is never built into `dist/`.

Each file there covers one post, so people working on different posts never
edit the same file:

```ts
import { definePaperReview } from "../../fixtures/figure-review/types";

export default definePaperReview({
  post: "my-post",
  paper: "My paper",
  order: 20,
  entries: [
    {
      figure: "my-post/loss",
      label: "Training loss",
      alt: "Training loss against step.",
      before: { kind: "image", src: "/writing/my-post/loss.png" },
      note: "Vector-extracted from the published PDF."
    },
    { kind: "diagram", figure: "my-post/states", label: "States", alt: "…" }
  ]
});
```

`before` is optional: for a figure redrawn from a published one, it shows how
the post showed it (`image`, `pdf`, `plotly`, `embed`, or `none` with a
`reason`) beside the rebuild, using the posts' own components so the
comparison is like for like. A narrow figure sits beside its "before"; wider
ones stack. The types are in `src/fixtures/figure-review/types.ts`.

## Recovering data from a PDF

Two optional Python tools in `scripts/figures/` read vector figures out of
PDFs. They need [uv](https://docs.astral.sh/uv/), which fetches PyMuPDF for
the run; nothing is installed into the project.

```bash
uv run --with pymupdf python scripts/figures/dump_pdf_paths.py FIGURE.pdf
```

Prints every path (stroke, fill, width, dashes, points) and text span on the
first page. Find the axis frame and tick labels, map path coordinates back to
data units, and record the file as `vector-extracted`.

```bash
uv run --with pymupdf python scripts/figures/extract_curves.py PAPER.pdf PAGE --clip x0,y0,x1,y1
```

Recovers line-and-band charts from a matplotlib figure: it finds each axes
from its grid, calibrates x and y against the numeric tick labels, reads each
coloured line and its translucent band, and names series from the legend.
`PAGE` counts from 0. Prints CSV (`panel,series,color,x,y,lo,hi`). Check its output against the
figure before trusting it.
