# Configuration

This template separates template-owned defaults from site-owned overrides.

Template defaults:

```txt
src/config/defaults/
```

Website overrides:

```txt
src/site/config.ts
```

Runtime code imports resolved config from `src/config`. Do not import defaults
directly from layouts, components, pages, or scripts.

## Merge Rules

- Objects deep-merge into defaults.
- Arrays replace defaults.
- Omitted values fall back to template defaults.

Arrays replace because order matters for fields like navigation and entry types.
If you customize an array, copy the full intended array into `src/site/config.ts`.

## Site Override Shape

Use `siteConfigOverrides`:

```ts
import type { SiteConfigOverrides } from "../config/types";

export const siteConfigOverrides = {
  site: {
    name: "Your Name",
    role: "Assistant Professor",
    affiliation: "Example University",
    url: "https://example.edu",
    links: {
      email: "mailto:you@example.edu",
      github: "https://github.com/example"
    }
  }
} satisfies SiteConfigOverrides;
```

Supported top-level sections:

- `site`: identity, metadata, links, navigation, homepage sections.
- `theme`: default color mode, toggle behavior, typography choices.
- `publications`: BibTeX source, grouping, author highlighting, previews.
- `graph`: global graph link and layout settings.
- `writing`: writing route, browser behavior, validation behavior.
- `entryTypes`: the writing entry type registry.

Low-level rendering internals should stay in template-owned code. If a visual or
feature option should be reusable by many sites, add a documented config knob to
the template rather than editing a downstream site locally.

## Publication Abstract Display

Publication abstracts can render differently on the full publications page and
the homepage selected-publications section. Each surface accepts the same modes:

- `"inline"`: show the abstract text in the publication item.
- `"popup"`: show an `Abstract` button that opens a dialog.
- `"hidden"`: do not show abstracts.

The template defaults both surfaces to popup dialogs. Downstream sites can
override either surface in `src/site/config.ts`:

```ts
export const siteConfigOverrides = {
  publications: {
    abstractDisplay: "inline"
  },
  site: {
    homepage: {
      selectedPublications: {
        abstractDisplay: "hidden"
      }
    }
  }
} satisfies SiteConfigOverrides;
```

## Entry Type Registry

Entry types are configured records, not hard-coded layout branches. Each record
has a stable `id`, display label, semantic role, graph styling, and article
defaults.

```ts
entryTypes: [
  {
    id: "essay",
    label: "Essay",
    role: "entry",
    ownsFolder: false,
    includeInRss: true,
    includeInRecent: true,
    graph: {
      shape: "circle",
      size: 10,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    },
    article: {
      localGraph: true,
      asides: "margin"
    }
  }
]
```

Roles:

- `hub`: top-level topic nodes. They appear in topic lists, topic cards, and hub
  graph layouts.
- `section`: nested organizer pages. These usually own folders but are not shown
  as top-level topics.
- `entry`: ordinary writing entries.

Common fields:

- `ownsFolder`: `true` makes `npm run new:entry` create `path/index.mdx`.
- `includeInRss`: controls whether dated entries of this type appear in RSS.
- `includeInRecent`: controls whether dated entries appear in homepage recent
  writing.
- `graph.shape`: one of `circle`, `square`, `diamond`, or `hexagon`.
- `graph.color`: any CSS color, including project CSS variables.
- `graph.labelVisibility`: `always`, `hover`, or `never`.
- `article.mode`: `article` (default) or `abstract`. `abstract` renders a short
  paper-record page whose body is the abstract itself. This is presentation
  only — graph styling and feed inclusion still come from the entry type. Most
  sites leave this at the default and opt in per entry with `article.mode` in
  frontmatter; set it here only for a type that is always abstract-only. See
  [Abstract-Only Entries](using-the-template.md#abstract-only-entries).
- `article.localGraph`: whether this type shows local graph context by default.
- `article.placement`: type-level TOC, local graph, backlinks, and related-entry
  placement.
- `article.asides`: default `<Aside>` placement.
- `article.toc`: type-level heading depth defaults for the article table of
  contents.

Replacing `entryTypes` is supported but advanced. Because arrays replace, a site
that customizes the registry should define the complete intended registry in
`src/site/config.ts`.

## Article TOC Depth

Article tables of contents include `h2` and `h3` by default:

```ts
export const siteConfigOverrides = {
  writing: {
    entryLayout: {
      toc: {
        default: {
          minDepth: 2,
          maxDepth: 3
        }
      }
    }
  }
} satisfies SiteConfigOverrides;
```

Depths can be configured globally, by entry type, or per entry. Valid values are
integers from `2` through `6`; `h1` is reserved for the article title rendered by
the layout. Partial overrides inherit omitted fields:

```ts
export const siteConfigOverrides = {
  writing: {
    entryLayout: {
      toc: {
        default: { maxDepth: 4 },
        byType: {
          paper: { maxDepth: 5 },
          note: { maxDepth: 2 }
        }
      }
    }
  }
} satisfies SiteConfigOverrides;
```

Entry type registry defaults use the same shape:

```ts
entryTypes: [
  {
    id: "paper",
    label: "Paper",
    role: "entry",
    graph: {
      shape: "circle",
      size: 12,
      color: "var(--graph-paper)",
      labelVisibility: "hover"
    },
    article: {
      toc: { maxDepth: 4 }
    }
  }
]
```

Individual entries can override the effective depth range in frontmatter:

```yaml
article:
  toc:
    minDepth: 2
    maxDepth: 4
```

## Content Paths

The resolved config currently expects these source paths:

```txt
src/content/pages/
src/content/writing/
src/data/news.yaml
src/data/publications.bib
```

These paths are site-owned after adoption. The template may include starter
content there, but downstream websites should treat it as replaceable content.
