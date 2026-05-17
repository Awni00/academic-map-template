# Academic Graph Writing Template

A configurable Astro template for academic websites with a professional homepage, conventional academic pages, a graph-structured writing corpus, and a BibTeX-generated publications page.

The template is designed to stay static-first and hackable:

- Academic identity first: homepage, publications, research, teaching, CV, contact links.
- Linked writing second: graph navigation for intentional conceptual relationships.
- Plain text source of truth: MDX content, one BibTeX file, YAML news, TypeScript config.
- No CMS, database, or runtime backend.

## Requirements

- Node `>=20.19.5`
- npm `>=10.8.2`

The project uses Astro 5, Tailwind 4, and `@astrojs/sitemap`, whose current dependency graph expects Node 20+.

## Quickstart

```bash
npm install
npm run dev
```

Open the local URL printed by Astro. The main routes are:

- `/`
- `/writing`
- `/writing/machine-learning-theory/bias-variance-refresher`
- `/publications`
- `/research`
- `/teaching`
- `/about`

## Build And Preview

```bash
npm run validate
npm run build
npm run preview
```

Useful scripts:

```bash
npm run new:entry
npm run new:entry -- --type paper --title "Chain-of-Thought Information" --path machine-learning-theory/chain-of-thought-information
npm run test
npm run test:e2e
npm run lint
npm run format
```

## Configuration Guide

Public configuration lives in `src/config/` and is re-exported from `src/config/index.ts`.

- `site.ts`: identity, nav, homepage sections, metadata, social links.
- `writing.ts`: writing route, entry types, browser behavior, RSS, validation severity.
- `graph.ts`: node type labels, shapes, colors, sizes, edge styling.
- `theme.ts`: default theme and typography preferences.
- `publications.ts`: BibTeX source, grouping, author highlighting, preview paths.

### Identity And Navigation

Edit `src/config/site.ts`:

```ts
name: "Your Name",
role: "PhD Student",
affiliation: "Your University",
links: {
  email: "mailto:you@example.com",
  cv: "/cv.pdf"
}
```

Navigation is plain config:

```ts
nav: [
  { label: "Home", href: "/" },
  { label: "Writing", href: "/writing" },
  { label: "Publications", href: "/publications" }
]
```

### Theme

Design tokens live in `src/styles/tokens.css`. The default aesthetic is minimal academic: serif body text, sans-serif UI, quiet borders, Distill-like article layouts, and graph colors by node type.

Global theme behavior is configured in `src/config/theme.ts`. Entries may override theme in frontmatter:

```yaml
theme: global # global | system | light | dark
```

## Content Model

### Custom Pages

Custom pages live in `src/content/pages/` and are outside the graph.

```txt
src/content/pages/research.mdx  -> /research
src/content/pages/foo/bar.mdx   -> /foo/bar
```

Use them for durable pages like research, teaching, about, lab members, or resources.

### Writing Entries

Writing entries live in `src/content/writing/**/*.mdx` and become graph nodes.

Required frontmatter:

```yaml
title: "Entry Title"
type: "paper" # hub | sub-hub | paper | post | note | teaching | project
```

Common optional fields:

```yaml
aliases:
  - Alternative Name
date: "2026-05-12"
summary: "Short description."
tags:
  - learning-theory
links:
  - machine-learning-theory/bias-variance-refresher
draft: false
external:
  arxiv: "https://arxiv.org/abs/..."
  code: "https://github.com/..."
layout:
  sidebar: true
  localGraph: true
```

Writing routes mirror the content-relative path. Use topic-first directories and `index.mdx` for hubs that own child entries:

```txt
src/content/writing/machine-learning-theory/index.mdx
  -> /writing/machine-learning-theory

src/content/writing/machine-learning-theory/bias-variance-refresher.mdx
  -> /writing/machine-learning-theory/bias-variance-refresher
```

The root `src/content/writing/index.mdx` is reserved because `/writing` is the graph browser. Changing a writing URL means moving or renaming the file or folder; frontmatter `slug` is not used for routing.

## Graph Semantics

Graph edges come only from frontmatter `links` and `[[wikilinks]]`.

Markdown links are ordinary links and do not affect the graph.

```md
links:
  - machine-learning-theory

This creates an edge to [[machine-learning-theory]].

[This normal Markdown link](/writing/machine-learning-theory) does not create an edge.
```

Supported wikilinks:

```md
[[machine-learning-theory]]
[[machine-learning-theory/bias-variance-refresher]]
[[machine-learning-theory/bias-variance-refresher|the bias-variance refresher]]
[[./test-error-decomposition]]
[[ML theory]]
```

Resolution order:

1. Canonical content path from `src/content/writing`.
2. Relative path from the current entry's folder for `./` and `../`.
3. Unique explicit alias.

Bare one-segment links do not search every basename. `[[quantum-mechanics]]` only resolves if `/writing/quantum-mechanics` exists or if `quantum-mechanics` is a unique alias. Use `[[learning/quantum-mechanics]]` for nested entries.

Unresolved wikilinks render as red `[[foo]]` and warn or fail according to `writingConfig.validation.links`.

### Hubs

Hubs are normal writing entries with `type: "hub"`. They appear as larger square graph nodes and are used as topic entry points in the writing browser and homepage topic cards.

Sub-hubs use `type: "sub-hub"`. They are path-aware folder entries like hubs, but render as smaller grey square nodes and do not appear as top-level topic entry points.

### Graph Styles

Edit `src/config/graph.ts` for node labels, shapes, sizes, and colors. CSS variables are defined in `src/styles/tokens.css`, for example:

```css
--graph-hub: #111111;
--graph-sub-hub: #7a808a;
--graph-paper: #3657d8;
--graph-teaching: #15803d;
```

## Article Components

MDX entries can use the built-in technical writing components:

- `Callout`
- `Theorem`
- `Proof`
- `MathBlock`
- `Figure`
- `Picture`
- `Aside`
- `BibtexBlock`
- `TableOfContents`
- `Video`
- `YouTubeVideo`
- `TwoColumns`
- `Comparison`
- `ModelViewer`

Example:

```mdx
<Callout type="tip" title="Main idea">
The graph should represent intentional conceptual links, not every hyperlink.
</Callout>

<Callout title="Neutral note">
Omit `type` for a neutral callout with no icon.
</Callout>

<Callout type="warning" title="Careful" accent="accent">
Set `accent` to override the default color for a callout type.
</Callout>

<Theorem label="Theorem" title="Generalization bound" id="thm:generalization">
Let $f$ be a predictor.
</Theorem>
```

`Callout` supports the main Obsidian-style types `note`, `abstract`, `info`, `todo`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, and `quote`. Unsupported or omitted types render with the neutral slab style and no icon. The optional `accent` prop accepts `accent`, `fg`, `muted`, or any CSS color.

Math uses KaTeX via `remark-math` and `rehype-katex`. Macros live in `src/lib/math/macros.ts`.

`Picture` supports theme-specific assets:

```mdx
<Picture
  lightSrc="/figures/model-light.svg"
  darkSrc="/figures/model-dark.svg"
  alt="Model diagram"
/>
```

or dark-mode inversion:

```mdx
<Picture src="/figures/model.svg" alt="Model diagram" invertInDarkMode />
```

## Publications

Publications are generated from one file:

```txt
src/data/publications.bib
```

Supported ordinary fields include `title`, `author`, `year`, `journal`, `booktitle`, `publisher`, `volume`, `number`, `pages`, `doi`, and `url`.

Supported display fields include `abbr`, `abstract`, `arxiv`, `html`, `pdf`, `code`, `blog`, `slides`, `poster`, `video`, `website`, `selected`, `preview`, and `bibtex_show`.

Example:

```bibtex
@inproceedings{example2026,
  title        = {Example Paper Title},
  author       = {Your Name and Coauthor Name},
  booktitle    = {Conference Name},
  year         = {2026},
  selected     = {true},
  bibtex_show  = {true},
  preview      = {example-preview.svg},
  pdf          = {/publications/example-paper.pdf},
  arxiv        = {2601.00000},
  code         = {https://github.com/...},
  blog         = {/writing/machine-learning-theory/bias-variance-refresher}
}
```

Preview resolution:

- `preview = {example-preview.svg}` becomes `/publications/example-preview.svg`.
- Absolute URLs and absolute paths pass through unchanged.

Homepage selected publications use `selected = {true}`.

## Homepage Customization

Homepage identity and section toggles are in `siteConfig.homepage`.

The prose section comes from:

```txt
src/content/pages/home.mdx
```

Default homepage order:

1. Hero.
2. Research summary.
3. "Explore Writing" widget (see below).
4. Selected publications.
5. Recent writing.
6. News.

News lives in `src/data/news.yaml`.

### Homepage: Explore Writing widget

The "Explore Writing" widget that sits below the hero is configured under
`siteConfig.homepage.writingPreview`. It is implemented by
[`src/components/graph/WritingPreview.tsx`](src/components/graph/WritingPreview.tsx)
and acts as a hand-off into the full writing map at `clickTarget`
(typically `/writing`).

The widget has two view modes, picked per-viewport:

- `"graph"` — interactive force-directed preview rendered via
  `react-force-graph-2d`. Click-and-drag a node, scroll-zoom, pan.
- `"topic-cards"` — a quiet grid of links to the writing hubs. No canvas,
  no JS work; friendlier on narrow viewports.

`desktopMode` controls the view at widths >680px; `mobileMode` controls
the view at ≤680px. The defaults are `desktopMode: "graph"` and
`mobileMode: "topic-cards"`. Set both to the same value to disable the
responsive swap.

The graph view shows a filtered subset of the full writing graph. Three
filter strategies:

```ts
// Every node:
filter: { mode: "all" }

// Only nodes of these types:
filter: { mode: "types", types: ["paper", "post"] }

// BFS outward from a root set:
filter: {
  mode: "neighborhood",
  roots: "hubs",      // or an array of EntryTypes
  depth: 2,           // levels of BFS; `null` = unbounded
  perRoot: 3          // neighbors per node per level; `null` = all
}
```

Other fields:

- `maxNodes` — hard cap applied after `filter`. `null` means no cap.
- `previewHeight` — pixel height of the graph canvas slot (defaults to
  360 in this template).
- `clickTarget` — where the "Open full map →" CTA links to.
- `title`, `description` — header text above the widget.

The topic-cards view ignores `filter`, `maxNodes`, and `previewHeight`;
it always renders one card per hub (`graph.hubs`).

## RSS, Sitemap, And SEO

RSS is enabled by default at:

```txt
/writing/rss.xml
```

Default RSS inclusion:

- `draft !== true`
- `date` exists
- type is `paper`, `post`, `note`, `teaching`, or `project`
- hubs and sub-hubs are excluded

Astro sitemap integration writes sitemap output during `npm run build`.

SEO metadata comes from `siteConfig`, with per-entry fallback:

1. Entry summary.
2. Site description.

## Validation

Run:

```bash
npm run validate
```

Validation catches:

- Missing title or type.
- Invalid type.
- Invalid date format.
- Duplicate canonical writing paths, including `foo.mdx` vs `foo/index.mdx`.
- Duplicate aliases and aliases that collide with another entry path.
- Reserved writing paths such as `rss.xml`.
- Unresolved wikilinks and frontmatter links.
- BibTeX parse failures.
- Missing selected publications when the homepage selected-publications section is enabled.

Unresolved link severity is configurable:

```ts
validation: {
  links: {
    unresolvedWikilinks: "warn",
    unresolvedFrontmatterLinks: "warn"
  }
}
```

## Deployment

### Vercel

Use the default Astro static build:

```bash
npm install
npm run build
```

Vercel should detect Astro automatically. Output is `dist/`.

### GitHub Pages

For a user or organization site, set `site` in `astro.config.ts`/`siteConfig.url` to your domain.

For a repository subpath, configure Astro `site` and `base` according to Astro's GitHub Pages guidance, then make sure links and assets resolve under that base path.

### Other Static Hosts

Netlify, Cloudflare Pages, and generic static hosting work with:

```bash
npm run build
```

Deploy the `dist/` directory.

## Troubleshooting

### Node Version

If Astro reports that Node is unsupported, use Node 20:

```bash
nvm use
```

or install Node `>=20.19.5`.

### Unresolved Wikilinks

Check spelling, canonical path, relative path, and aliases. Use full paths for nested entries and `aliases` for short natural names:

```yaml
aliases:
  - ML theory
```

### Empty Graph

Add frontmatter `links` or `[[wikilinks]]`. Normal Markdown links do not create edges.

### Publications Not Showing On Homepage

Set:

```bibtex
selected = {true}
```

in `src/data/publications.bib`.

## Implementation References

This template follows Astro's current documentation for content collections, routing, Tailwind integration, sitemap generation, and MDX setup.
