# Abstract-only article layout

Task: `create-abstract-article-layout` (`t-20260809-C99S`, p1/m, tag `layout`).

## Context

The template has one presentation for every writing entry: a full article with
header, TOC sidebar, prose body, and graph footer. There is no good way to
record a paper you want in the writing graph but have not written a post about.
Today that forces either an empty-feeling `paper` entry or leaving the paper out
of the graph entirely.

This adds an **abstract mode**: a short, self-contained page whose body is the
paper's abstract, presented as an emphasized block, with the existing Distill-style
header (title / authors / venue / dates / arXiv-code-slides chips) doing the rest
of the work. Optional hero figure and optional brief commentary. These pages stay
in the writing graph with backlinks and related entries, so a paper record links
to the notes and posts around it.

### Why a mode, not a new entry type

The user asked for these to show up as `paper` in the graph — same shape, colour,
RSS and recent-writing behaviour. That settles the design:

- **Entry type is the identity axis.** It drives graph shape/colour, folder
  ownership, RSS and recent inclusion, and topic grouping. A separate `abstract`
  type would fragment the graph legend for a purely visual difference, and because
  `entryTypes` arrays *replace* rather than merge (`src/config/resolve.ts:231-244`,
  documented at `docs/configuration.md:145-147`), every downstream site that
  customizes the registry would have to restate it to pick up the new type.
- **Layout mode is a presentation axis.** It belongs beside `width`, `asides`,
  `placement`, and `toc` in the existing three-level cascade
  (frontmatter → `byType` → default) in `src/lib/article/placement.ts`.

So: no new entry type. Add `mode` to the same cascade. An entry opts in with
`layout: { mode: abstract }` and keeps `type: "paper"`. `article.mode` is still
added to the entry-type registry so a downstream site *can* declare a type that
defaults to abstract mode, at essentially zero cost — this is what the template
means by "configured records, not hard-coded layout branches"
(`docs/configuration.md:87-89`).

### Scope note

`<Commentary>` is included: it was part of the selected answer for where the
abstract text lives (body = abstract, so commentary needs its own home). The
prominent "Read the paper" CTA was **not** selected — external links stay as the
existing `.entry-chip` row.

## Target usage

```mdx
---
title: "Attention is all you need"
type: "paper"
date: "2026-03-04"
venue: "NeurIPS 2017"
authors:
  - name: "Author One"
    affiliation: "Example Lab"
tags: [attention, sequence-models]
links: [research-papers]
external:
  arxiv: "https://arxiv.org/abs/0000.00000"
  code: "https://github.com/example/repo"
hero:
  src: "/figures/example-architecture.png"
  alt: "Model architecture"
  caption: "Figure 1 from the paper."
layout:
  mode: abstract
---

The dominant sequence transduction models are based on complex recurrent or
convolutional networks with $\mathcal{O}(n^2)$ attention ...

<Commentary>
Two sentences on why this one matters to me.
</Commentary>
```

## Implementation

### 1. Config plumbing — `mode` joins the existing cascade

Mirror exactly how `asides` is threaded through today.

- **`src/config/types.ts`**
  - `export type ArticleMode = "article" | "abstract";`
  - `EntryTypeArticleConfig` (`:33-39`): add `mode?: ArticleMode`.
  - `WritingConfig["entryLayout"]` (`:113-141`): add
    `mode: { default: ArticleMode; byType: Record<EntryType, ArticleMode> }`.
- **`src/config/defaults/writing.ts`** (`:55-91`): add
  `mode: { default: "article", byType: {} }` to `entryLayout`.
- **`src/config/resolve.ts`** `resolveWritingConfig` (`:105-187`): collect
  `modeByType[entryType.id] = entryType.article?.mode ?? base.entryLayout.mode.default`
  in the existing loop, and spread it into the returned `entryLayout.mode` block —
  copy the `asides` block verbatim.
- **`src/config/index.ts`**: export the `ArticleMode` type.
- **`src/config/defaults/entryTypes.ts`**: no change (every type stays
  `"article"` by default).

### 2. Frontmatter schema — `src/content.config.ts`

- Inside the existing `layout` object (`:92-122`), next to `width`/`asides`:
  ```ts
  // Presentation mode. "abstract" renders a short paper-record page whose
  // body is the abstract itself; "article" is the standard long-form layout.
  mode: z.enum(["article", "abstract"]).optional(),
  ```
- New top-level field (content metadata, not layout), reusing the URL-or-root-path
  pattern from `externalLinks` (`:41-53`):
  ```ts
  hero: z
    .object({
      src: z.string().url().or(z.string().startsWith("/")),
      alt: z.string().default(""),
      caption: z.string().optional()
    })
    .optional(),
  ```
  `hero` is deliberately *not* gated on abstract mode — it renders in both modes.

### 3. Type mirror — `src/lib/graph/types.ts`

`WritingEntryLike.data` (`:89-135`) hand-mirrors the schema. Add
`hero?: { src: string; alt?: string; caption?: string }` and
`mode?: "article" | "abstract"` inside `layout`.

### 4. Resolver — `src/lib/article/placement.ts`

Add alongside `resolveArticleWidth` (`:94-102`), same three-level shape:

```ts
export function resolveArticleMode(entry: WritingEntryLike): ArticleMode {
  const type = entry.data.type as EntryType;
  const cfg = writingConfig.entryLayout.mode;
  return (
    entry.data.layout?.mode ??
    (cfg.byType as Record<string, ArticleMode>)[type] ??
    cfg.default
  );
}
```

### 5. Layout — `src/layouts/WritingEntryLayout.astro`

Stay in the existing layout file; **do not add a second layout or a new `kind`
branch in `src/pages/[...path].astro`**. The header, `BaseLayout` wrapper,
`EntryFooter`, and grid are all shared, and duplicating the ~85-line Distill
header into a parallel layout is the main maintenance cost to avoid. The delta
is small and mostly CSS.

Changes in the frontmatter block (`:54-167`):

- `const articleMode = resolveArticleMode(entry);` and
  `const isAbstract = articleMode === "abstract";`
- Force `tocSide = "none"` when `isAbstract` — an abstract has no headings, so a
  TOC rail would render empty or near-empty. Apply it where `tocSide` is derived
  (`:118-119`) so `renderLeft`/`renderRight`/`sideHasContent` all follow. Leave
  `localGraph`, `backlinks`, `related` alone: footer graph context is the reason
  these pages exist.
- Set `asidesEffective` to `"inline"` when `isAbstract` (margin asides need a
  gutter the abstract card does not use).
- Register `Commentary` in the `components` map (`:138-159`).

Changes in the template:

- Add `data-mode={articleMode}` to `.article-grid` (`:172-180`) so CSS can key off it.
- In `<main class="article-main">` (`:310-314`):
  ```astro
  {entry.data.hero && (
    <Figure
      class="article-hero"
      src={entry.data.hero.src}
      alt={entry.data.hero.alt}
      caption={entry.data.hero.caption}
    />
  )}
  {isAbstract ? (
    <section class="abstract-block" aria-label="Abstract">
      <h2 class="abstract-block__label">Abstract</h2>
      <div class="article-content" data-asides="inline">
        <Content components={components} />
      </div>
    </section>
  ) : (
    <div class="article-content" data-asides={asidesEffective}>
      <Content components={components} />
    </div>
  )}
  ```
  `Figure` (`src/components/article/Figure.astro`) is already imported and takes
  a plain `src`/`alt`/`caption` — reuse it rather than writing new hero markup.

### 6. New component — `src/components/article/Commentary.astro`

Small, in the style of `src/components/article/Aside.astro` / `Callout.astro`:
a `<aside class="entry-commentary">` with an optional `title` prop (default
"Commentary") rendering a label plus `<slot />`. Registered globally in the
components map, so it also works in normal articles.

### 7. Styles — `src/styles/article.css`

Add one section near the existing header/prose blocks:

- `.article-hero` — figure treatment above the body; caps at the reading column,
  modest top/bottom rhythm.
- `.abstract-block` — the emphasis. Bordered/tinted card using existing tokens
  (`--color-border-soft`, `--color-surface`, `--color-fg-soft`), generous padding,
  `max-width: 760px`, body serif at `--article-body-size`.
- `.abstract-block__label` — uppercase mono eyebrow matching `.article-meta`
  (`:352-364`); must not inherit `.article-content h2` sizing.
- `.entry-commentary` — when it is inside `.abstract-block` it becomes the card's
  second section: `border-top: 1px solid var(--color-border-soft)`, its own small
  label, sans-serif (`--font-ui`) and muted, so the quoted abstract and the
  author's voice read as clearly different. Also style it standalone for use in
  normal articles.
- `.article-grid[data-mode="abstract"] .article-header` — tighter vertical
  rhythm; the page is short, so the current 56px top / 44px bottom header padding
  is too airy.
- Mobile: fold into the existing `@media` block around `:1435-1444` (reduce card
  padding).

Dark mode comes free via the token variables — verify, don't hardcode colours.

### 8. Content example

Add `src/content/writing/research-papers/example-abstract.mdx` — `type: "paper"`,
`layout: { mode: abstract }`, placeholder metadata in the house style of
`vae-explainer.mdx` ("Your Name", `arxiv.org/abs/0000.00000`), a hero pointing at
an existing asset under `public/`, and a short `<Commentary>`. Add it to `links`
in `src/content/writing/research-papers/index.mdx` and mention it in that hub's
prose so the graph edge and the demo are both real.

### 9. Docs

- `docs/using-the-template.md` — new "Abstract-only entries" subsection under
  "Writing Entries" (after the `layout.toc` paragraph, ~`:143`): what the mode is
  for, the YAML block, that the body *is* the abstract, `<Commentary>`, `hero`,
  and that `type` stays `paper` so the graph is unchanged. Add `mode` and `hero`
  to the "Common optional frontmatter" YAML block (`:79-102`).
- `docs/configuration.md` — add `article.mode` to the entry-type bullet list
  (~`:137-147`), noting the default is `article` and that per-entry
  `layout.mode` overrides it.

### 10. Tests

- `tests/unit/config.test.ts` — assert `writingConfig.entryLayout.mode.default`
  is `"article"` and that a registry entry with `article: { mode: "abstract" }`
  lands in `entryLayout.mode.byType` (mirrors the existing width/asides
  assertions).
- New `tests/unit/placement.test.ts` — cover the `resolveArticleMode` cascade
  (frontmatter wins over byType wins over default) using the same fixture style
  as `tests/unit/toc.test.ts`. `placement.ts` currently has no unit test, so this
  also closes a small gap.

## Verification

```bash
npm run lint && npx tsc --noEmit && npm run test:unit
```

Then build and check the page in the browser preview:

```bash
npm run build
```

- Start the dev server via the preview tools (not Bash) and open
  `/writing/research-papers/example-abstract`.
- Confirm: no TOC rail; header renders authors/venue/date/chips; hero figure
  above the abstract card; abstract in the emphasized block; commentary visually
  distinct; footer still shows local graph, backlinks, and related.
- Check `read_console_messages` and `preview_logs` for errors.
- Toggle dark mode and resize to mobile (`resize_window`) — the card must not
  overflow horizontally.
- Regression: open `/writing/research-papers/vae-explainer` and a hub page and
  confirm the standard layout, TOC, and margin asides are unchanged.
- Screenshot the abstract page for the user.

## Task tracking

`dot-tasks start create-abstract-article-layout`, write this plan into the task's
`plan.md`, `log-activity` at the config / layout+styles / docs+tests milestones,
and `complete` once verification passes.
