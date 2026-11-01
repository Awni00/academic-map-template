# Theming

The site's colours come from a **theme**: a named set of colour tokens plus a
matching Shiki theme for code blocks. The template ships eighteen; a site picks one
light and one dark, and can define its own.

Ownership: template-owned, except `src/site/themes.ts`, which is yours. See
[Repo Ownership](repo-ownership.md).

## Choosing a theme

In `src/site/config.ts`:

```ts
theme: {
  light: "dawn",
  dark: "rose-pine",
  defaultMode: "system",   // "light" | "dark" | "system"
  allowToggle: true
}
```

`light` and `dark` are theme ids. `defaultMode` is what a first-time reader
gets; after that their own choice is remembered. The header toggle cycles
light → dark → system, so a reader can always hand the decision back to their
operating system.

Restart the dev server after editing — it reads this at startup.

### Built-in themes

| id                 | Appearance | Source palette                |
| ------------------ | ---------- | ----------------------------- |
| `paper`            | light      | The template's own warm white |
| `ink`              | dark       | The template's own near-black |
| `ember-light`      | light      | Paper, vermilion, blue links  |
| `ember-dark`       | dark       | Ink, ember, blue links        |
| `claret-light`     | light      | Paper, wine red, navy links   |
| `claret-dark`      | dark       | Ink, rose, blue links         |
| `pine-light`       | light      | Paper, pine green, blue links |
| `pine-dark`        | dark       | Ink, sea green, blue links    |
| `indigo-light`     | light      | Paper, indigo, coral terms    |
| `indigo-dark`      | dark       | Ink, lavender, coral terms    |
| `dawn`             | light      | Rosé Pine Dawn                |
| `rose-pine`        | dark       | Rosé Pine                     |
| `everforest-light` | light      | Everforest Light              |
| `everforest-dark`  | dark       | Everforest Dark               |
| `latte`            | light      | Catppuccin Latte              |
| `mocha`            | dark       | Catppuccin Mocha              |
| `github-light`     | light      | GitHub Light                  |
| `github-dark`      | dark       | GitHub Dark                   |

To see them all against real type, run the dev server and open
`/fixtures/themes`. That page is development-only and is never built into
`dist/`.

## Writing your own theme

Add it to `src/site/themes.ts`. Only three colours are required:

```ts
export const customThemes: readonly ThemeInput[] = [
  {
    id: "seminar",
    label: "Seminar",
    appearance: "light",
    shiki: "min-light",
    colors: {
      bg: "#fffdf8",
      fg: "#1b1a17",
      accent: "#8a3324",
    },
  },
];
```

Then point at it: `theme: { light: "seminar", dark: "ink" }`.

Everything you leave out is derived. Surfaces, borders and secondary text are
mixed from `bg` toward `fg`, so they land in your theme's own colour space. The
hued semantics — danger, warning, success, info, example — cannot be derived
from a background, so they fall back to accessible defaults for the appearance
you declared. Fill any of them in to take control:

```ts
colors: {
  bg: "#fffdf8",
  fg: "#1b1a17",
  accent: "#8a3324",
  muted: "#6a655c",
  warning: "#b8791a",
  "graph-teaching": "#3f6b46"
}
```

### Levels of control

You can stop at any of these three levels:

1. **Three colours.** `bg`, `fg` and `accent`. Everything else is derived,
   and the accent is used for everything interactive.
2. **Optional roles.** Split two jobs off the accent when you want them to
   look different:

   | Role         | Paints                                                     | Default    |
   | ------------ | ---------------------------------------------------------- | ---------- |
   | `link`       | Links in running text, and their underline                 | `accent`   |
   | `annotation` | `<Term>` words and `<HoverNote>` marks, and their highlight | `accent`   |

   ```ts
   colors: {
     bg: "#fffdf8",
     fg: "#1b1a17",
     accent: "#8a3324",
     link: "#1f5f8b"   // links go blue; terms, nav and pills keep the accent
   }
   ```

   The accent keeps everything else: the current nav item, pill and button
   hovers, the table of contents, publication links, asides, and the graph's
   highlights.

3. **Full overrides.** Any token in the table below, stated literally. Each
   role has companions you can set too: `link-line` (link underline),
   `annotation-soft` (the highlight while a note is open) and
   `annotation-line` (a term's dotted underline). Left out, they are mixed from
   their role — or, if the role itself is unset, copied from the accent's own
   `accent-line` / `accent-soft`.

A role that is not set costs nothing: the site looks exactly as it would
without it.

Giving a theme the same `id` as a built-in replaces it. That is the supported
way to retune a shipped theme — do that rather than editing
`src/config/defaults/themes.ts`, so template updates keep reaching you.

### The tokens

Each becomes a CSS custom property: `bg` → `--color-bg`, `graph-hub` →
`--graph-hub`, `placeholder-a` → `--placeholder-a`.

| Group        | Tokens                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Surfaces     | `bg`, `bg-soft`, `bg-soft-2`, `surface-raised`                                                                           |
| Text         | `fg`, `fg-soft`, `muted`, `muted-2`                                                                                      |
| Lines        | `border`, `border-soft`, `rule`                                                                                          |
| Accent       | `accent`, `accent-soft`, `accent-line`                                                                                   |
| Roles        | `link`, `link-line`, `annotation`, `annotation-soft`, `annotation-line`                                                  |
| Semantics    | `danger`, `warning`, `success`, `info`, `example`, `quote`, each with a `-text` variant                                  |
| Graph        | `graph-hub`, `graph-sub-hub`, `graph-paper`, `graph-post`, `graph-note`, `graph-teaching`, `graph-project`, `graph-edge` |
| Placeholders | `placeholder-a`, `placeholder-b`                                                                                         |

Non-colour tokens — the type scale, spacing, layout widths, radii — are not
part of a theme. They live in `src/styles/tokens.css` and are shared by every
theme.

### Why the semantics come in pairs

`warning` and `warning-text` are the same colour doing two jobs. The bare token
paints things you look _at_ — a callout's left rule, an icon, a graph node —
where WCAG asks for 3:1. The `-text` variant paints things you _read_, such as
a callout's title, where it asks for 4.5:1.

Collapsing them into one value means tuning that value for the stricter target,
which turns every gold in every palette into brown. Keeping them separate is
what lets Everforest stay Everforest.

## Typography

A theme is a palette. It carries no typefaces, and switching between light and
dark never changes the type — reflowing metrics on a theme toggle reads as a
bug, not a feature.

Type is configured globally, in three layers:

| Layer    | Where                                      | What it controls                                                                                                                                                                                                                    |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Families | `src/site/fonts.ts`                        | The actual typefaces. Declared through Astro's Fonts API, which self-hosts them at build time and exposes `--font-serif-loaded`, `--font-sans-loaded`, `--font-mono-loaded`. Defaults are Source Serif 4, Inter, and IBM Plex Mono. |
| Aliases  | `src/styles/tokens.css`                    | `--font-serif`, `--font-sans`, `--font-mono`                                                                                                                                                                                        |
| Roles    | `theme.typography` in `src/site/config.ts` | Which alias each role uses, as `--font-body`, `--font-ui`, `--font-code`                                                                                                                                                            |

To change typefaces, edit `src/site/fonts.ts`. To set prose in sans instead of
serif, change the role:

```ts
theme: {
  light: "paper",
  dark: "ink",
  typography: {
    body: "sans",   // "serif" | "sans"
    ui: "sans",     // "sans" | "serif"
    code: "mono"
  }
}
```

### Justified text

Prose is set ragged-right by default, with `text-wrap: pretty` evening out
the line ends. To justify it instead:

```ts
theme: {
  typography: {
    justify: {
      enabled: true,      // default false
      hyphenate: true,    // hyphens: auto, so justified lines don't open wide gaps
      minWidth: "all"     // "all" | "tablet": "tablet" leaves phones ragged-right
    }
  }
}
```

Justification applies to paragraphs and list items in the homepage bio, custom
pages, and article bodies. Headings, captions, figures and tables, code,
callouts, asides and margin notes, the publication list, and the writing
browser stay left-aligned. Hyphenation uses the page language, which the
layout sets with `<html lang="en">`.

On a narrow phone column even hyphenated justified text spaces unevenly, which
is what `minWidth: "tablet"` is for.

A page can switch it on or off for itself, keeping the site's `hyphenate` and
`minWidth`, in its frontmatter. This works for custom pages (including
`home.mdx`) and writing entries:

```yaml
article:
  justify: true
```

Article-level sizes and line heights are a separate concern again — they live
in the `--article-*` tokens in `src/styles/article.css`, documented under
[Article Typography](using-the-template.md#article-typography).

## Contrast

`npm run validate` measures every registered theme — built-in and custom — and
fails the build on anything unreadable:

| Token                                                      | Minimum contrast against `bg` | Why                                         |
| ---------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `fg`                                                       | 7:1                           | Body and headings, set in a 17px serif; AAA |
| `fg-soft`                                                  | 5.5:1                         | Secondary prose                             |
| `muted`                                                    | 4.5:1                         | Small UI text; AA                           |
| `muted-2`                                                  | 3:1                           | Micro-labels only                           |
| `accent`, `link`, `annotation`                             | 4.5:1                         | Links, terms and note marks are text        |
| `*-text`                                                   | 4.5:1                         | Semantic colours used as text               |
| `danger`, `warning`, `success`, `info`, `example`, `quote` | 3:1                           | Rules and icons                             |
| `graph-*` nodes                                            | 3:1                           | Graphic objects                             |
| `border`, `rule`                                           | 1.2:1                         | Advisory warning, not an error              |

Text also appears on `surface-raised`, the surface behind the phone menu, the
contents and filter sheets and the map's inspector. There `fg`, `fg-soft`,
`muted` and `accent` must clear 4.5:1 and `muted-2` 3:1. A light theme's
raised surface is its `bg`. A dark one is lifted up to 9% toward `fg`, so it
separates from the page, but only as far as those colours stay readable on
it; a theme whose `muted` is close to its limit gets a smaller lift. Set
`surface-raised` yourself to choose it.

Two colours are also measured against the tint they sit on rather than `bg`:
`accent` on `accent-soft` (publication links) and `annotation` on
`annotation-soft` (a term or note mark while its note is open). Both must
clear 4.5:1.

Failures name the token and the measured ratio:

```
Error: Theme "seminar" token "muted": #c9c9c9 on #fffdf8 is 1.66:1, below the 4.5:1 required
```

Derived tokens are measured too. When the colours they are mixed from are
literal and opaque, the mix is worked out at build time and emitted as hex. A
derived grey or tint that would miss its target is nudged back toward the
colour that clears it — a grey toward `fg`, a highlight toward `bg` — just far
enough to pass. So if your `fg` and `accent` are readable, nothing you left out
can fail; most themes clear every target at the usual mix and are not moved. Only
a mix of something the build cannot read — a `var()`, a translucent colour —
stays a `color-mix()` for the browser to resolve; those are reported as
"verify it by eye" rather than passing silently.

Translucent colours are fine for any token except `bg`. They are measured as
they are actually seen, blended over `bg`, so `rgba(20, 20, 20, 0.15)` on white
counts as the pale grey it renders as, not as near-black. `bg` itself must be
opaque, because everything else is measured against it and whatever would
show through it is unknowable.

Most built-ins are ports of editor themes, tuned to clear these thresholds.
Editor palettes are designed for monospace at a comfortable zoom and several of
them, the light ones especially, fall below AA when reused for long-form serif
prose on a wide measure. Every value that was moved is marked `tuned from` in
`src/config/defaults/themes.ts`, with the upstream hex alongside it.

## Code blocks

Each theme names a Shiki theme. Both selected themes are compiled into the
page, and each token carries `--shiki-light` and `--shiki-dark` custom
properties rather than a baked colour, so code recolours with everything else.

Any [Shiki bundled theme](https://shiki.style/themes) id works; the `shiki`
field is typed, so your editor will list them.

## Images that need a dark variant

Pass `lightSrc` and `darkSrc` to `Picture`; the active one is chosen from the
site's theme, not the operating system's:

```mdx
<Picture
  lightSrc="/figures/plot-light.svg"
  darkSrc="/figures/plot-dark.svg"
  alt="..."
/>
```

For a diagram that only needs inverting, `invertInDarkMode` is cheaper than
maintaining two files. `EmbedFrame` takes the same prop for light-only iframes.

## How it fits together

| File                                         | Owner    | Role                                   |
| -------------------------------------------- | -------- | -------------------------------------- |
| `src/config/defaults/themes.ts`              | template | The eighteen built-in themes           |
| `src/site/themes.ts`                         | **site** | Your themes                            |
| `src/site/config.ts`                         | **site** | Which two are active                   |
| `src/config/resolve.ts`                      | template | Builds the registry, resolves the pair |
| `src/lib/theme/defineTheme.ts`               | template | Fills in omitted tokens                |
| `src/lib/theme/themeCss.ts`                  | template | Renders a theme as CSS                 |
| `src/lib/theme/contrast.ts`, `checkTheme.ts` | template | The contrast rules                     |
| `src/components/layout/ThemeStyles.astro`    | template | Emits the two blocks into `<head>`     |
| `src/styles/tokens.css`                      | template | Everything that is _not_ a colour      |

The tokens are emitted inline in `<head>`, before the theme bootstrap script,
so there is no flash of the wrong palette. `:root` carries the light theme, so
a page still renders correctly with JavaScript disabled.
