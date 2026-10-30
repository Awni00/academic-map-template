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
- `theme`: which light and dark theme the site uses, default color mode,
  toggle behavior, typography choices (including justified prose), the
  site-wide page width (`layout.contentWidth`), and the default `HoverNote` and `Term`
  style (`hoverNotes.marker`, `hoverNotes.appearance`, `terms.underline`). See
  [Theming](theming.md), [Hover Notes](using-the-template.md#hover-notes), and
  [Terms](using-the-template.md#terms).
- `publications`: BibTeX source, grouping, author highlighting, previews.
- `graph`: global graph link, layout, and interaction settings.
- `writing`: writing route, browser behavior, validation behavior.
- `entryTypes`: the writing entry type registry.

### Graph interaction

`graph.interaction.drag` decides whether readers can rearrange a graph by
dragging its nodes:

- `none` — nodes are fixed. Panning and zooming still work.
- `stays` — a dropped node keeps where it was put, and nothing else moves.
  Cheaper, and leaves the rest of the layout exactly as the reader found it.
- `resettle` (default) — as `stays`, but the layout re-runs afterwards so the
  neighbours make room. Livelier, at the cost of recalculating the whole graph
  on every drop.

Both draggable modes pin the node on release; a mode that handed it straight
back to the forces would look like the drag had been refused. The setting
applies to the writing browser and the per-entry local maps. The homepage
preview is decorative and is never draggable. Dragging is mouse and pen only —
on touch, a drag pans the canvas as before.

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

Math in an abstract is typeset with KaTeX in every mode: write `$…$` or
`\(…\)` in the BibTeX `abstract` field, as in a paper. It uses the same
macros as articles (`src/site/math.ts`). `\$` is a literal dollar, and
prices stay prose: a `$` with no partner, or a pair with a space just inside
or a digit right after (`costs $5 and $10`), is left as text. To print
abstracts exactly as written instead:

```ts
export const siteConfigOverrides = {
  publications: {
    abstractMath: false
  }
} satisfies SiteConfigOverrides;
```

## Homepage Hero

The homepage opens with a "margin card": your photo, a short caption (name,
role, affiliation), and your profile links in a card beside the bio. The bio
is `src/content/pages/home.mdx`, and it never wraps around the card.

| Width | Layout |
| --- | --- |
| Desktop, over 900px | Card on one side (240px by default), a 56px gap, the bio filling the rest. |
| Tablet, 561–900px | The same two columns, with the card at 0.75× its desktop width and a 32px gap. |
| Phone, 560px and under | The card above the bio: centered with a 160px photo, or a compact row. |

Every setting, with its default:

```ts
export const siteConfigOverrides = {
  site: {
    homepage: {
      hero: {
        enabled: true,
        photo: {
          side: "left",          // "left" | "right"
          width: 240,            // px on desktop, 180–300
          shape: "rounded",      // "rounded" | "circle" | "square"
          radius: 12,            // px, for "rounded"
          position: "50% 22%",   // CSS object-position of the square crop
          sticky: false          // keep the card in view beside a long bio
        },
        caption: {
          showName: true,
          extra: []              // e.g. ["she/her", "On the job market, 2027"]
        },
        links: {
          show: ["email", "cv", "scholar", "github", "x", "linkedin"],
          style: { desktop: "pills", mobile: "pills" }
        },
        phone: { layout: "centered" }  // "centered" | "compact"
      }
    }
  }
} satisfies SiteConfigOverrides;
```

- `enabled`: `false` removes the hero.
- `photo.side`: which side the card sits on, on desktop and tablet. On a
  phone the card is always above the bio.
- `photo.width`: the card's desktop width. Values outside 180–300 are clamped,
  and `npm run validate` says so. Tablet uses 0.75× this width; the phone
  photo is a fixed 160px (76px in the compact layout).
- `photo.shape` and `photo.radius`: the photo is always cropped square;
  `rounded` uses `radius`, `circle` and `square` ignore it.
- `photo.position`: which part of the photo the square crop keeps, as a CSS
  `object-position`. Raise the second value to move the crop down, e.g.
  `"50% 40%"`.
- `photo.sticky`: the card stays in view while a long bio scrolls past it, on
  desktop and tablet.
- `caption.showName`: the header already shows your name, so you can hide it
  here. It stays in the page as its `<h1>` for screen readers and search
  engines.
- `caption.extra`: more caption lines, under the affiliation.
- `links.show`: which `site.links` keys appear, in order. Keys that
  `site.links` doesn't define are skipped, so the default list is safe even
  without an X or LinkedIn link. If you set the list yourself, validation
  warns about keys with no link.
- `links.style`: how the links look, with one style for desktop and one for
  tablet and phone:
  - `pills`: outlined chips, all the same width, each with its icon at the
    left and its label centered in the rest. Rows are full except perhaps
    one pill short at the end. The number of columns is
    the most the widest label allows across the card, so it adapts to your
    labels and to each layout: six links come out three across on desktop
    and phone and two across in the narrower tablet card. Beside the bio
    the pills span the photo's width. Without JavaScript they wrap at their
    own widths.
  - `icons`: icons only, spread across the photo width on desktop. The labels
    stay available to screen readers and as tooltips.
  - `list`: two columns of icon and label, no outlines.
  - `text`: a plain "Email · CV · Scholar" row, without outlines or icons.
  - `text-icons`: the same row, with each link's icon before its label.

  The text styles wrap by the same rule as pills: every row holds the same
  number of links, the last at most one fewer, and no row ends on a "·".

  On touch screens every style gives each link a tap target of at least
  44×44px.
- `phone.layout`: `centered` stacks the card centered above the bio;
  `compact` is one row with a 76px photo and the caption and links beside it.

Without a photo (`site.profileImage: ""`), the caption and links sit above the
bio. The bio keeps the same line length it would have beside a photo.

Fixed by the template: the overall structure, breakpoints, gaps, the bio's
measure, caption typography and order, and tap-target sizes.

### Profile links

`site.links` maps a key to a URL. These keys come with a label and an icon:
`email`, `cv`, `scholar`, `github`, `gitlab`, `x` or `twitter` (labelled
"Twitter", with the bird; `icon: "x"` gives the X logo), `linkedin`,
`orcid`, `bluesky`, `mastodon`, `threads`, `semantic-scholar`, `researchgate`,
`arxiv`, `youtube`, `website`, and `rss`. For anything else, give a label and
optionally an icon:

```ts
site: {
  links: {
    email: "mailto:you@example.edu",
    orcid: "https://orcid.org/0000-0000-0000-0000",
    lab: { label: "My Lab", href: "https://lab.example.edu", icon: "website" }
  },
  homepage: {
    hero: { links: { show: ["email", "orcid", "lab"] } }
  }
}
```

An unknown string key gets a title-cased label and a generic link icon. The
icons are inline SVGs bundled with the template, in `src/lib/home/heroIcons.ts`,
so nothing loads from an icon CDN. An unknown `icon` name falls back to the
generic link icon, with a validation warning.

## Content Width

`theme.layout.contentWidth` sets the width of every page's main column,
including the 32px side gutters. The header, footer, homepage sections, and the
writing browser's topic list all use it, so they share the same left and right
edges and leave equal margins.

```ts
export const siteConfigOverrides = {
  theme: {
    layout: { contentWidth: 1020 }
  }
} satisfies SiteConfigOverrides;
```

The default 1020 is sized to the hero: 660 (bio measure) + 56 (gap) + 240
(photo) + 2 × 32 (gutters). Because the bio column takes whatever the card
leaves, changing the width changes the bio's line length.
`npm run validate` warns when that falls outside 520–720px. Values must be
between 640 and 1600.

The side gutter is 16px on phones, 24px on tablets, and 32px on desktop, on
every page. Pages that need more room keep their own wider layouts: the
writing map (up to 1440px), the writing list (1180px), and article pages with
a table of contents and margin asides (1340px).

## Renaming The Writing Section

`writing.route` moves the writing browser and every entry URL, and
`writing.label` names the section: the browser's heading, its page title and
description, the RSS feed title, and the homepage "View all" card. The map's
breadcrumb reads "All {label}", lowercased; set `writing.browser.labels.all`
when that reads badly.

```ts
export const siteConfigOverrides = {
  writing: {
    route: "/blog",
    label: "Blog",
    rss: { route: "/blog/rss.xml" },
    browser: { labels: { all: "All posts" } }
  }
} satisfies SiteConfigOverrides;
```

The nav is a separate array (`site.nav`), so update its entry too, and the
homepage section title (`site.homepage.recentWriting.title`).

## Homepage Recent Writing

The homepage shows the newest dated entries as a horizontally scrolling row of
cards, three across on desktop with the next one peeking in, swipeable on
touch. By default the row ends in a card linking to the full writing browser.
An entry appears when it has a `date`, is not a draft, and its type has
`includeInRecent` enabled.

```ts
export const siteConfigOverrides = {
  site: {
    homepage: {
      recentWriting: {
        enabled: true,
        title: "Recent posts",
        maxItems: 6,
        select: "featured-first",
        viewAll: {
          enabled: true,
          label: "View all →",
          description: "Browse every post"
        }
      }
    }
  }
} satisfies SiteConfigOverrides;
```

- `enabled`: show or hide the section. It is also hidden when no entry
  qualifies.
- `title`: the section heading, default `"Recent writing"`. Set it alongside
  `writing.label` and `writing.route` if you rename the writing section.
- `maxItems`: how many entries to show, default `6`.
- `select`: which entries fill the row, newest first within each group.
  - `featured-first` (default): entries with `featured: true` in their
    frontmatter, then the rest. Without any featured entry this is the same
    as `recent`. If you feature `maxItems` or more entries, the row shows only
    those.
  - `recent`: by date only; `featured` is ignored.
  - `featured`: only featured entries. Retitle the section to match, e.g.
    `title: "Featured writing"`.
- `viewAll`: the card that ends the row. `enabled: false` drops it, leaving
  only the recent entries. `label` is its link text, default `"View all →"`.
  `description` is the line beneath, default `"Browse {writing.label}"`, so it
  follows a renamed section; `""` hides it.

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
- `graph.labelVisibility`: `always` paints the title on the canvas beside the
  node permanently (used for hubs), `hover` shows a floating label beside the
  cursor, `never` shows no label at all.
- `graph.interactive`: `false` makes nodes of this type ignore clicks. Defaults
  to `true`. Whether a given graph responds to clicks at all is still decided by
  the surface — the article-page and homepage graphs are read-only.
- `article.mode`: `article` (default) or `abstract`. `abstract` renders a short
  paper-record page whose body is the abstract itself. This is presentation
  only — graph styling and feed inclusion still come from the entry type. Most
  sites leave this at the default and opt in per entry with `article.mode` in
  frontmatter; set it here only for a type that is always abstract-only. See
  [Abstract-Only Entries](using-the-template.md#abstract-only-entries).
- `article.placement`: type-level TOC, local graph, linked-from, and related-entry
  placement. To hide the local map for a type, set
  `placement.localGraph.where` to `"none"` — that is the only switch; there is
  no separate boolean.
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
