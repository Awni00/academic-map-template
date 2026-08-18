# Using The Template

## Start Locally

```bash
npm install
npm run dev
```

Run checks before publishing:

```bash
npm run validate
npm run build
```

## Edit Site Configuration

Use the site-owned override file:

```txt
src/site/config.ts
```

Most personal choices belong there: name, role, affiliation, homepage section
toggles, navigation, social links, publication author highlighting, graph
styling, theme preferences, and entry type choices.

Do not edit `src/config/defaults/` in a downstream website unless you intend to
diverge from the template.

## Custom Pages

Custom pages live in:

```txt
src/content/pages/
```

Examples:

```txt
src/content/pages/home.mdx      -> /
src/content/pages/research.mdx  -> /research
src/content/pages/foo/bar.mdx   -> /foo/bar
```

Use custom pages for durable website pages such as research, teaching, about,
lab members, resources, or CV notes. These pages are outside the writing graph.

## Writing Entries

Writing entries live in:

```txt
src/content/writing/
```

Required frontmatter:

```yaml
title: "Entry Title"
type: "note"
```

Common optional frontmatter:

```yaml
aliases:
  - Alternative Name
date: "2026-05-24"
displayDates:
  - label: "Page"
    date: "2026-05-24"
summary: "Short description."
venue: "Conference or Journal Name"
tags:
  - learning-theory
links:
  - machine-learning-theory/bias-variance-refresher
draft: false
external:
  arxiv: "https://arxiv.org/abs/..."
  code: "https://github.com/..."
hero:
  src: "/figures/teaser.svg"
  alt: "Description of the figure"
  caption: "Optional caption."
article:
  mode: article
  asides: margin
  toc:
    minDepth: 2
    maxDepth: 4
```

The `article` block holds per-entry presentation overrides and mirrors the
`article` block in the entry type registry, so the same keys mean the same
thing at both levels. Do not name this key `layout`: Astro reserves
`frontmatter.layout` as a path to a layout component and will fail the build
with a syntax error if it holds an object.

`hero` renders an optional lead figure above the article body. It works in
both presentation modes.

For paper-style writing entries, `venue` is intentionally stored in entry
frontmatter even if the same paper also appears in `src/data/publications.bib`.
This keeps writing entries portable and prevents article headers from depending
on a BibTeX lookup.

### Article Date Display

Use canonical `date` for sorting, RSS, graph/list views, and recent entries.
Article headers render that date under one `Date` byline column.

```yaml
date: "2025-10-29"
```

renders as:

```txt
Date
Oct 29, 2025
```

If the article needs a small date history in the header, add `displayDates`.
This only changes the article header display; `date` remains canonical for
ordering and feeds.

```yaml
date: "2025-10-29"
displayDates:
  - label: "Page"
    date: "2025-10-29"
  - label: "arXiv v1"
    date: "2025-05-21"
  - label: "NeurIPS"
    date: "2025-09-18"
```

renders as:

```txt
Date
Page: Oct 29, 2025
arXiv v1: May 21, 2025
NeurIPS: Sep 18, 2025
```

`article.toc` controls which article heading depths appear in the table of
contents for this entry. Depths map to Markdown heading levels `##` through
`######`; `#` is reserved for the article title rendered by the layout. Omitted
fields inherit from the type-level or global default, which includes `h2` and
`h3`.

### Abstract-Only Entries

Use `article.mode: abstract` to record a paper that does not have its own
explainer or post. The entry body *is* the paper's abstract, and the layout
presents it as an emphasized block under the standard article header:

```yaml
title: "Latent structure in overparameterized models"
type: "paper"
venue: "Example Conference on Learning Representations, 2026"
authors:
  - name: "Your Name"
    affiliation: "Your University"
external:
  arxiv: "https://arxiv.org/abs/..."
  code: "https://github.com/..."
hero:
  src: "/figures/teaser.svg"
  alt: "Model architecture"
article:
  mode: abstract
```

Mode is presentation only. Keep `type: "paper"` (or whichever type fits) so the
entry keeps its usual graph shape and colour, its RSS inclusion, and its place
in topic lists. An abstract entry is a full graph citizen: backlinks, related
entries, and the local graph all render in the footer as usual.

Because the body is the abstract, the article table of contents is suppressed
in this mode regardless of placement config, and `<Aside>` blocks render inline.

Routes mirror the content-relative path:

```txt
src/content/writing/machine-learning-theory/index.mdx
  -> /writing/machine-learning-theory

src/content/writing/machine-learning-theory/bias-variance-refresher.mdx
  -> /writing/machine-learning-theory/bias-variance-refresher
```

Create entries with:

```bash
npm run new:entry -- --type note --title "My Note" --path learning/my-note
```

If the configured entry type owns a folder, the script creates
`path/index.mdx`; otherwise it creates `path.mdx`.

## Graph Links

The writing graph is built from frontmatter `links` and `[[wikilinks]]`.
Ordinary Markdown links do not create graph edges.

```yaml
links:
  - machine-learning-theory
```

```md
This entry links to [[machine-learning-theory]].
This entry links with a label to [[machine-learning-theory|ML theory]].
This relative link points beside the current file: [[./neighbor-entry]].
```

Resolution order:

1. Canonical content path from `src/content/writing`.
2. Relative path from the current entry folder for `./` and `../`.
3. Unique explicit alias.

Use full paths for nested entries unless you define a unique alias.

## Publications And News

Publications are generated from:

```txt
src/data/publications.bib
```

Homepage news comes from:

```txt
src/data/news.yaml
```

Both files are site-owned after adoption.

## Article Components

MDX entries can use built-in technical writing components:

- `Box`
- `Callout`
- `Statement`
- `Theorem`
- `Proof`
- `Figure`
- `FigureGrid`
- `Picture`
- `Aside`
- `TableOfContents`
- `Video`
- `YouTubeVideo`
- `TwoColumns`
- `Comparison`
- `ModelViewer`
- `PlotlyFigure`

### Media layout controls

Use component props for figure sizing before reaching for raw HTML or page-local
CSS. The common props are:

- `width`, `maxWidth`: size the outer figure or media container.
- `mediaWidth`, `mediaMaxWidth`, `mediaHeight`, `mediaMaxHeight`: size the media
  frame inside a figure.
- `mediaAspectRatio`: set a frame ratio such as `"3 / 2"` or `"16 / 9"`.
- `mediaFit`: choose `"contain"`, `"cover"`, `"fill"`, `"none"`, or
  `"scale-down"`.
- `mediaInset`: add padding inside the media frame for diagrams.
- `mediaAlign`: align media with `"start"`, `"center"`, `"end"`, or
  `"stretch"`.

For matched scientific plots, prefer `FigureGrid` with equal frames:

```mdx
<FigureGrid columns={2} equalFrames mediaAspectRatio="3 / 2">
  <Figure>
    <Picture slot="figure" src="/figures/plot-a.svg" alt="Plot A." />
    <Fragment slot="caption">First plot.</Fragment>
  </Figure>
  <Figure>
    <Picture slot="figure" src="/figures/plot-b.svg" alt="Plot B." />
    <Fragment slot="caption">Second plot.</Fragment>
  </Figure>
</FigureGrid>
```

Use per-figure overrides for diagrams that need breathing room:

```mdx
<Figure mediaInset="18px 40px">
  <Picture slot="figure" src="/figures/transition-diagram.svg" alt="DFA transition diagram." />
  <Fragment slot="caption">DFA transition diagram.</Fragment>
</Figure>
```

Interactive and video embeds use the same outer controls. Existing `height`
props on `EmbedFrame` and `PlotlyFigure` remain supported:

```mdx
<PlotlyFigure
  src="/figures/demo-plotly.html"
  iframeTitle="Interactive Plotly figure"
  height="480px"
  maxWidth="48rem"
/>

<Video src="/media/demo.mp4" mediaAspectRatio="16 / 9" maxWidth="42rem" />
```

`class` and `style` are available as escape hatches on media components, but
prefer semantic props for reusable layouts so the template keeps control of the
visual system.

Use the prose components by role:

| Component | Use for | Avoid using for |
| --- | --- | --- |
| `Callout` | Editorial notes, tips, warnings, caveats, examples, and reader guidance. | Formal claims or boxed equations. |
| `Statement` | Formal theorem-like environments: `Definition`, `Assumption`, `Lemma`, `Proposition`, `Theorem`, `Corollary`, `Result`, or `Example`. | Informal advice or visual emphasis alone. |
| `Theorem` | Convenience wrapper for literal theorem environments. | General formal blocks; prefer `Statement` with an explicit `label`. |
| `Proof` | Proof paragraphs following a formal statement. | Standalone notes or derivations that are not proofs. |
| `Box` | Boxed takeaways, emphasized formulas, compact summaries, or implementation objectives. | Warnings, tips, or formal theorem-like claims. |

Examples:

```mdx
<Callout type="tip" title="Main idea">
The graph should represent intentional conceptual links, not every hyperlink.
</Callout>

<Statement label="Definition" title="point-wise risk" id="def:risk">
The point-wise expected squared loss at a query $x_0$ is
$$
R(x_0) = \mathbb{E}[(\hat f(x_0) - Y_0)^2].
$$
</Statement>

<Theorem title="Generalization bound" id="thm:generalization">
Let $\mathcal{F}$ be a finite function class.
</Theorem>

<Proof>
Apply the union bound over $\mathcal{F}$.
</Proof>

<Box title="Training loss">
$$
\mathcal{L}(\theta, \phi; x)
=
-\mathbb{E}_{q_\phi(z \mid x)}[\log p_\theta(x \mid z)]
+
\mathrm{KL}(q_\phi(z \mid x) \| p(z)).
$$
</Box>
```

### Plotly Figures

Use `PlotlyFigure` for standalone Plotly HTML exports that should be embedded
as interactive article figures:

```mdx
<PlotlyFigure
  src="/writing/research/my-entry/figures/latent-map.html"
  iframeTitle="Interactive latent map"
  caption="Interactive view of the learned latent geometry."
/>
```

`iframeTitle` is used only as the iframe accessible name. It is not displayed
as a figure title; visible chart titles should be part of the Plotly figure or
the caption.

Recommended Python export settings:

```py
fig.write_html(
    "public/writing/research/my-entry/figures/latent-map.html",
    include_plotlyjs="cdn",
    include_mathjax="cdn",
    full_html=True,
    config={"responsive": True, "displaylogo": False},
)
```

Use `include_mathjax="cdn"` whenever Plotly labels, annotations, legends, or
hover text contain TeX. The exported HTML is loaded inside an iframe, so the
site-level math renderer cannot provide MathJax for the embedded document.

Prefer valid TeX strings in Plotly labels and avoid nested dollar math such as
`\text{$DAT$}`. Use a single math expression, for example `$\mathrm{DAT}$`, or
move plain text outside the TeX delimiters.

Prefer these components over raw HTML for article structure. Avoid inline `style`,
layout `<div>` wrappers, raw `<table>`, and raw `<img>` tags in authored MDX;
use Markdown tables, `Figure`, `FigureGrid`, `TwoColumns`, `Callout`,
`Statement`, and `Box` so the
template owns the visual language.

## Article Typography

Article typography is controlled by semantic `--article-*` CSS custom
properties near the top of `src/styles/article.css`. Override those tokens for
article-specific scale changes instead of setting one-off component font sizes.

| Role | Default | Used for |
| --- | --- | --- |
| Body | `18px` / `1.7` line-height | Article prose and content-bearing component bodies: `Callout`, `Statement`, `Theorem`, `Proof`, and `Box`. |
| Article title | `48px`, `36px` on mobile | Writing-entry titles. |
| Summary | `20px`, `17px` on mobile | Entry summaries under the title. |
| Headings | `24px`, `20px`, `18px`, `16px` | Article `h2` through `h5`/`h6`. |
| Component title / formal label | `18px` | `Callout` titles, `Box` titles, `Statement` parenthetical titles, and `Statement`/`Theorem` labels; typography, case, weight, and font family distinguish the role. |
| Metadata label | `12px` | Article metadata labels, sidebar headings, TOC depth labels, footer labels, and compact image labels. |
| Caption / aside / UI | `13px` | Figure captions, margin notes, TOC text, tags, and compact article navigation. |
| Table | `14px` | Tables and structured article-footer rows. |

## Validation

Run:

```bash
npm run validate
```

Validation catches missing titles, invalid entry types, invalid dates, duplicate
writing paths, duplicate aliases, reserved writing paths, unresolved wikilinks,
unresolved frontmatter links, and BibTeX parse failures.
