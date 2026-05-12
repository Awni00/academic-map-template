# Academic Graph Writing Website Template — Implementation Handoff Spec

**Date:** 2026-05-12  
**Purpose:** Implementation handoff for a cloneable academic website template centered on a professional academic landing page plus a graph-structured writing corpus.

---

## 1. Product Goal

Build a configurable, minimal, hackable academic website template for researchers. The site should combine:

1. A professional academic homepage and conventional academic pages.
2. A graph-centered writing section for blog posts, paper explainers, research notes, hubs, teaching notes, and project notes.
3. A generated publications page from a single BibTeX file.
4. A high-quality technical writing experience inspired by Distill-style article layouts.

The graph is a supporting navigation and discovery tool, not the primary academic identity of the site.

Core framing:

```txt
professional academic site first
linked writing graph second
static-first implementation
plain-text content as source of truth
strong defaults, shallow customization surface
```

---

## 2. Design Philosophy

### 2.1 Academic credibility first

The homepage must immediately communicate:

```txt
who the person is
institution / role
research areas
selected publications or outputs
links to CV, Scholar, GitHub, email, etc.
```

The graph should be visible and distinctive but should not obstruct standard academic navigation.

### 2.2 Graph as intentional content structure

The graph should represent intentional conceptual relationships in the writing corpus. It should not be generated from every hyperlink.

The graph is:

\[
G=(V,E)
\]

where:

```txt
V = writing entries
E = frontmatter links ∪ wikilinks
```

Edges are untyped in v1.

### 2.3 Plain-text authoring

Content should be authored as Markdown/MDX in the repository. There should be no database, CMS, or runtime backend requirement.

### 2.4 Configurable template, not hard-coded personal site

The default example content may resemble an AI/ML academic website, but the template must not hard-code that use case. Node types, labels, navigation, styling, graph behavior, homepage sections, and routes should be configurable.

---

## 3. Technical Stack

Use:

```txt
Astro
MDX
React islands
react-force-graph-2d
Tailwind CSS + CSS variables/design tokens
KaTeX
BibTeX parser
npm workflow
```

Architecture:

```txt
Astro static site
├─ static academic shell
├─ MDX writing collection
├─ BibTeX-driven publications page
└─ React graph islands
   ├─ GraphPreview
   ├─ GraphBrowser
   └─ LocalGraph
```

Implementation principles:

```txt
static-first
client-side JS only where interactive behavior is needed
graph components hydrate as React islands
most pages render as static HTML
```

---

## 4. Route Structure

Required routes:

```txt
/                  academic homepage
/writing           graph-centered writing browser
/writing/[slug]    individual writing entries
/publications      generated publications page from publications.bib
```

Custom user pages:

```txt
src/content/pages/research.mdx  → /research
src/content/pages/teaching.mdx  → /teaching
src/content/pages/about.mdx     → /about
src/content/pages/foo/bar.mdx   → /foo/bar
```

Custom pages are outside the writing graph.

The default writing route is `/writing`, but route and label should be configurable.

---

## 5. Repository Structure

Recommended structure:

```txt
.
├─ astro.config.mjs
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ README.md
│
├─ public/
│  ├─ favicon.svg
│  ├─ profile.jpg
│  └─ publications/
│     ├─ example-preview.png
│     └─ example-paper.pdf
│
├─ scripts/
│  ├─ new-entry.ts
│  └─ validate.ts
│
├─ src/
│  ├─ config/
│  │  ├─ site.ts
│  │  ├─ writing.ts
│  │  ├─ graph.ts
│  │  ├─ theme.ts
│  │  ├─ publications.ts
│  │  └─ index.ts
│  │
│  ├─ content/
│  │  ├─ writing/
│  │  │  ├─ hubs/
│  │  │  │  ├─ research-papers.mdx
│  │  │  │  ├─ machine-learning-theory.mdx
│  │  │  │  └─ education-teaching.mdx
│  │  │  ├─ papers/
│  │  │  │  └─ example-paper.mdx
│  │  │  ├─ notes/
│  │  │  │  └─ example-note.mdx
│  │  │  ├─ teaching/
│  │  │  │  └─ example-teaching-note.mdx
│  │  │  └─ projects/
│  │  │     └─ example-project.mdx
│  │  │
│  │  └─ pages/
│  │     ├─ home.mdx
│  │     ├─ research.mdx
│  │     ├─ teaching.mdx
│  │     └─ about.mdx
│  │
│  ├─ data/
│  │  ├─ publications.bib
│  │  └─ news.yaml
│  │
│  ├─ components/
│  │  ├─ graph/
│  │  │  ├─ GraphBrowser.tsx
│  │  │  ├─ GraphPreview.tsx
│  │  │  └─ LocalGraph.tsx
│  │  ├─ article/
│  │  │  ├─ Callout.astro
│  │  │  ├─ Theorem.astro
│  │  │  ├─ Proof.astro
│  │  │  ├─ MathBlock.astro
│  │  │  ├─ Figure.astro
│  │  │  ├─ Picture.astro
│  │  │  ├─ Aside.astro
│  │  │  ├─ BibtexBlock.astro
│  │  │  ├─ Video.astro
│  │  │  ├─ YouTubeVideo.astro
│  │  │  ├─ TwoColumns.astro
│  │  │  ├─ ModelViewer.astro
│  │  │  ├─ Comparison.tsx
│  │  │  └─ TableOfContents.tsx
│  │  ├─ publications/
│  │  │  ├─ PublicationList.astro
│  │  │  └─ PublicationItem.astro
│  │  └─ layout/
│  │     ├─ Header.astro
│  │     ├─ Footer.astro
│  │     └─ ThemeToggle.tsx
│  │
│  ├─ layouts/
│  │  ├─ BaseLayout.astro
│  │  ├─ HomeLayout.astro
│  │  ├─ WritingEntryLayout.astro
│  │  └─ PageLayout.astro
│  │
│  ├─ lib/
│  │  ├─ graph/
│  │  │  ├─ buildGraph.ts
│  │  │  ├─ resolveLinks.ts
│  │  │  ├─ neighborhoods.ts
│  │  │  └─ types.ts
│  │  ├─ publications/
│  │  │  ├─ parseBibtex.ts
│  │  │  └─ formatPublication.ts
│  │  ├─ search/
│  │  │  └─ writingSearch.ts
│  │  ├─ math/
│  │  │  └─ macros.ts
│  │  └─ wikilinks/
│  │     └─ remarkWikilinks.ts
│  │
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ publications.astro
│  │  ├─ writing/
│  │  │  ├─ index.astro
│  │  │  └─ [...slug].astro
│  │  ├─ writing-rss.xml.ts
│  │  └─ [...page].astro
│  │
│  └─ styles/
│     ├─ globals.css
│     ├─ tokens.css
│     ├─ article.css
│     └─ graph.css
```

`src/config/index.ts` should re-export the modular config files so implementation code can import from a stable path:

```ts
export { siteConfig } from "./site";
export { writingConfig } from "./writing";
export { graphConfig } from "./graph";
export { themeConfig } from "./theme";
export { publicationsConfig } from "./publications";
```

---

## 6. Configuration System

Use multiple config files under `src/config/`, re-exported from `src/config/index.ts`.

### 6.1 `site.ts`

Identity, navigation, homepage sections, and global metadata.

```ts
export const siteConfig = {
  title: "Academic Website",
  name: "Your Name",
  role: "PhD Student",
  affiliation: "Your University",
  description: "Academic website and linked research writing.",
  url: "https://example.com",
  profileImage: "/profile.jpg",

  links: {
    email: "mailto:you@example.com",
    cv: "/cv.pdf",
    github: "https://github.com/...",
    scholar: "https://scholar.google.com/..."
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "Writing", href: "/writing" },
    { label: "Publications", href: "/publications" },
    { label: "Research", href: "/research" },
    { label: "Teaching", href: "/teaching" },
    { label: "CV", href: "/cv.pdf" }
  ],

  homepage: {
    hero: { enabled: true },
    researchSummary: { enabled: true, source: "home.mdx" },
    writingPreview: {
      enabled: true,
      placement: "below-hero",
      desktopMode: "static-graph",
      mobileMode: "topic-cards",
      filter: {
        mode: "types",
        types: ["hub"]
      },
      maxNodes: 30,
      clickTarget: "/writing",
      title: "Explore Writing",
      description:
        "Research notes, paper explainers, and teaching materials organized as a linked map."
    },
    selectedPublications: {
      enabled: true,
      field: "selected",
      maxItems: 5
    },
    recentWriting: {
      enabled: true,
      maxItems: 3
    },
    news: {
      enabled: true,
      maxItems: 5
    }
  }
};
```

### 6.2 `writing.ts`

```ts
export const writingConfig = {
  route: "/writing",
  label: "Writing",

  entryTypes: ["hub", "paper", "post", "note", "teaching", "project"],

  browser: {
    defaultView: {
      desktop: "map",
      mobile: "topics"
    },
    urlState: true,
    focus: {
      defaultMode: "dim",
      allowModeToggle: true,
      defaultDepth: 1,
      allowDepthToggle: true
    },
    mobile: {
      graphPlacement: "collapsed",
      defaultPreviewMode: "cards"
    }
  },

  entryLayout: {
    articleLayout: {
      default: "distill",
      byType: {
        hub: "wide",
        paper: "distill",
        post: "distill",
        note: "narrow",
        teaching: "narrow",
        project: "wide"
      }
    },

    sidebar: {
      default: true,
      byType: {
        hub: true,
        paper: true,
        post: true,
        note: true,
        teaching: false,
        project: true
      },
      sections: ["toc", "localGraph", "backlinks", "related"]
    },

    localGraph: {
      enabled: true,
      defaultDepth: 1,
      maxNodes: 20,
      mobile: "collapsed",
      byType: {
        hub: true,
        paper: true,
        post: true,
        note: true,
        teaching: false,
        project: true
      }
    },

    hubPages: {
      autoRenderLinkedEntries: true,
      groupLinkedEntriesBy: "type"
    }
  },

  validation: {
    links: {
      unresolvedWikilinks: "warn",
      unresolvedFrontmatterLinks: "warn"
    }
  }
};
```

### 6.3 `graph.ts`

```ts
export const graphConfig = {
  colorBy: "type",

  nodeTypes: {
    hub: {
      label: "Hub",
      shape: "square",
      size: 18,
      color: "var(--graph-hub)",
      labelVisibility: "always"
    },
    paper: {
      label: "Paper",
      shape: "circle",
      size: 12,
      color: "var(--graph-paper)",
      labelVisibility: "hover"
    },
    post: {
      label: "Post",
      shape: "circle",
      size: 10,
      color: "var(--graph-post)",
      labelVisibility: "hover"
    },
    note: {
      label: "Note",
      shape: "circle",
      size: 9,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    },
    teaching: {
      label: "Teaching",
      shape: "diamond",
      size: 11,
      color: "var(--graph-teaching)",
      labelVisibility: "hover"
    },
    project: {
      label: "Project",
      shape: "hexagon",
      size: 11,
      color: "var(--graph-project)",
      labelVisibility: "hover"
    }
  },

  links: {
    color: "var(--graph-edge)",
    width: 1,
    opacity: 0.4
  }
};
```

### 6.4 `theme.ts`

```ts
export const themeConfig = {
  defaultMode: "system",
  allowToggle: true,
  typography: {
    body: "serif",
    ui: "sans",
    code: "mono"
  }
};
```

### 6.5 `publications.ts`

```ts
export const publicationsConfig = {
  source: "src/data/publications.bib",

  grouping: {
    by: "year",
    order: "desc"
  },

  authorHighlight: ["Your Name"],

  bibtex: {
    showButtonField: "bibtex_show"
  },

  previews: {
    enabled: true,
    basePath: "/publications"
  }
};
```

---

## 7. Writing Content Model

All files under `src/content/writing/**/*.mdx` are writing entries and graph nodes.

Required frontmatter:

```ts
title: string
type: "hub" | "paper" | "post" | "note" | "teaching" | "project"
```

Optional frontmatter:

```ts
slug?: string;
aliases?: string[];
date?: string;
updated?: string;
summary?: string;
tags?: string[];
links?: string[];
featured?: boolean;
draft?: boolean;
theme?: "global" | "system" | "light" | "dark";
external?: {
  paper?: string;
  arxiv?: string;
  doi?: string;
  code?: string;
  slides?: string;
  poster?: string;
  website?: string;
  video?: string;
};
layout?: {
  sidebar?: boolean;
  localGraph?: boolean;
  toc?: boolean;
};
```

Example:

```mdx
---
title: "Chain-of-Thought Information"
type: "paper"
date: "2026-05-12"
updated: "2026-05-12"
summary: "An explainer for a paper on information-theoretic views of chain-of-thought."
tags:
  - chain-of-thought
  - learning-theory
  - information-theory
links:
  - machine-learning-theory
  - chain-of-thought
draft: false
theme: global
external:
  arxiv: "https://arxiv.org/abs/..."
  code: "https://github.com/..."
---

Body text with semantic graph links like [[machine-learning-theory]].
```

---

## 8. Slugs and Subdirectories

Subdirectories are supported for author organization but do not define graph structure.

Use flattened slugs by default:

```txt
src/content/writing/papers/cot-info.mdx → /writing/cot-info
src/content/writing/hubs/ml-theory.mdx → /writing/ml-theory
```

Slug resolution:

```txt
1. explicit frontmatter slug
2. flattened filename slug
```

Duplicate flattened slugs must fail validation.

Aliases:

```yaml
aliases:
  - ML theory
  - machine learning theory
```

Link resolution order:

```txt
1. exact slug/id
2. exact alias
3. normalized title
4. normalized alias
5. unresolved warning/error according to config
```

Normalization:

```txt
lowercase
trim
replace spaces with hyphens
strip basic punctuation
```

---

## 9. Graph Semantics

Graph edges come only from:

```txt
frontmatter links
[[wikilinks]]
```

Normal Markdown links render normally but do not contribute graph edges, even if they point to `/writing/[slug]`.

### 9.1 Frontmatter links

```yaml
links:
  - ml-theory
  - cot-info
```

Behavior:

```txt
adds graph edge current-entry → target
no body-rendering effect
```

### 9.2 Wikilinks

Supported syntax:

```md
[[ml-theory]]
[[Machine Learning Theory]]
[[ml-theory|machine learning theory]]
```

Resolved behavior:

```txt
renders as internal link to /writing/[slug]
adds graph edge current-entry → target
```

Unresolved behavior:

```txt
renders visibly as red [[foo]]
emits warning or error according to config
does not add graph edge
```

Suggested unresolved style:

```css
.unresolved-wikilink {
  color: var(--color-danger);
  border-bottom: 1px dashed var(--color-danger);
  font-family: var(--font-mono);
}
```

### 9.3 Markdown links

```md
[ML theory](/writing/ml-theory)
[Publications](/publications)
[Google Scholar](https://scholar.google.com)
```

Behavior:

```txt
render normally
no graph edge
```

---

## 10. Graph Data Pipeline

Build-time pipeline:

```txt
MDX writing files
  ↓
validate frontmatter schema
  ↓
compute canonical flattened ids
  ↓
resolve aliases
  ↓
extract frontmatter links
  ↓
extract wikilinks via remark plugin
  ↓
resolve links
  ↓
deduplicate edges
  ↓
build GraphIndex
  ↓
derive backlinks, outgoing links, neighborhoods, hubs, search docs
```

Core types:

```ts
type EntryType = "hub" | "paper" | "post" | "note" | "teaching" | "project";

type EntryNode = {
  id: string;
  slug: string;
  title: string;
  type: EntryType;
  tags: string[];
  summary?: string;
  date?: string;
  updated?: string;
  url: string;
};

type GraphEdge = {
  source: string;
  target: string;
};

type GraphIndex = {
  nodes: EntryNode[];
  edges: GraphEdge[];
  backlinks: Record<string, string[]>;
  outgoing: Record<string, string[]>;
  hubs: EntryNode[];
};
```

---

## 11. Graph Components

### 11.1 `GraphBrowser`

Used on `/writing`.

Desktop layout:

```txt
┌──────────────┬───────────────────────────────┬───────────────┐
│ Topics       │ Graph                         │ Preview       │
│ Search       │                               │ selected node │
│ Type filters │                               │ metadata      │
│ Tag filters  │                               │ summary       │
│ Hub tree     │                               │ backlinks     │
│ Focus mode   │                               │ outgoing      │
│ Depth        │                               │ Open entry    │
└──────────────┴───────────────────────────────┴───────────────┘
```

Approved behavior:

```txt
left panel: topics/search/filters/view controls
center panel: react-force-graph-2d graph
right panel: selected entry preview
```

Node click behavior:

```txt
click node → select node and update preview pane
preview pane has Open Entry button
```

Hub/topic click behavior:

```txt
click hub in left panel → focus hub
focus dims unrelated nodes by default
filter mode toggle can show only focused neighborhood
```

Selection and focus are separate:

```txt
focus = topic/subgraph currently emphasized
selected = node shown in preview pane
```

URL state must be supported:

```txt
/writing?view=map
/writing?focus=machine-learning-theory
/writing?selected=cot-info
/writing?type=paper,note
/writing?tag=learning-theory
/writing?focus=ml-theory&depth=2&mode=dim
```

Recommended state type:

```ts
type WritingBrowserState = {
  view: "map" | "topics" | "list";
  focus?: string;
  selected?: string;
  query?: string;
  types?: EntryType[];
  tags?: string[];
  depth: 1 | 2;
  focusMode: "dim" | "filter";
};
```

Focus semantics:

\[
V_h^{(1)} = \{h\} \cup N(h)
\]

\[
V_h^{(2)} = \{h\} \cup N(h) \cup N^2(h)
\]

Dim mode:

```txt
show all nodes
dim nodes outside focused neighborhood
```

Filter mode:

```txt
show only focused neighborhood
```

Default:

```txt
focusMode = dim
depth = 1
```

### 11.2 `GraphPreview`

Used on homepage as a teaser widget.

Purpose:

```txt
visual preview of writing graph
entry point to /writing
not full navigation surface
```

Configurable:

```ts
type GraphPreviewMode = "static-graph" | "interactive-graph" | "topic-cards" | "none";
```

Default homepage behavior:

```txt
placement: below hero
desktopMode: static-graph
mobileMode: topic-cards
```

Preview graph filter:

```ts
filter: {
  mode: "all" | "types";
  types?: EntryType[];
}
```

If `mode = "types"`, preview graph uses:

\[
V' = \{v \in V : v.type \in T\}
\]

Default preview filter:

```ts
filter: {
  mode: "types",
  types: ["hub"]
}
```

Mobile topic cards should be generated from `type: hub` entries and link to:

```txt
/writing?focus=<hub-id>
```

### 11.3 `LocalGraph`

Used on `/writing/[slug]` pages.

Default:

```txt
enabled for hub, paper, post, note, project
disabled for teaching by default
depth = 1
maxNodes = 20
mobile = collapsed
```

Configurable globally and by type.

---

## 12. Graph Rendering Defaults

Use `react-force-graph-2d`.

Node visual defaults:

```txt
hub       square, larger, label always visible
paper     circle, medium-large
post      circle, medium
note      circle, smaller
teaching  diamond
project   hexagon
```

Labels:

```txt
hubs always labeled
other nodes labeled on hover
```

Color model:

```txt
configurable, default color by node type
```

Custom node rendering should use `nodeCanvasObject` to draw shapes and labels.

No graph position persistence is required; force layout may compute on each load.

---

## 13. `/writing` Search and Filtering

Search scope is writing entries only.

v1 implements simple structured search over:

```txt
title
summary
tags
type
```

No full-text body search is required.

Search document:

```ts
type WritingSearchDocument = {
  id: string;
  title: string;
  summary?: string;
  tags: string[];
  type: EntryType;
  date?: string;
  url: string;
};
```

Config:

```ts
search: {
  writing: {
    enabled: true,
    implementation: "simple",
    scope: "writing",
    fields: ["title", "summary", "tags", "type"]
  },
  site: {
    enabled: false
  }
}
```

No tag pages should be generated. Tags filter `/writing` only.

---

## 14. Writing Entry Pages

Route:

```txt
/writing/[slug]
```

Default desktop layout:

```txt
┌──────────────────────────────────────────────┬──────────────┐
│ Article header                               │ Sidebar      │
│ Title                                        │ On this page │
│ Type/date/tags/summary                       │ Local graph  │
│ External links                               │ Backlinks    │
├──────────────────────────────────────────────┤ Related      │
│ MDX content                                  │              │
│ figures, math, theorem boxes, asides, code   │              │
└──────────────────────────────────────────────┴──────────────┘
```

Mobile layout:

```txt
Title
Metadata
Summary
MDX content
ToC / Backlinks / Local graph collapsed or below content
```

Article layout modes:

```txt
narrow   = simple readable single column
Distill  = technical article with sidebar and margin notes
wide     = hub/project-oriented wider layout
```

Default by type:

```txt
hub      wide
paper    distill
post     distill
note     narrow
teaching narrow
project  wide
```

Sidebar default:

```txt
globally enabled
configurable by entry type
sections: toc, localGraph, backlinks, related
```

Hub pages:

```txt
hubs are normal MDX writing entries with type: hub
auto-render linked entries by default
group linked entries by type by default
```

---

## 15. MDX Components

The template should provide a compact but expressive technical writing component set.

Required article components:

```txt
Callout
Theorem
Proof
MathBlock
Figure
Picture
Aside
BibtexBlock
TableOfContents
Video
YouTubeVideo
TwoColumns
Comparison
ModelViewer
```

### 15.1 `Callout`

```mdx
<Callout type="intuition" title="Main idea">
The graph should represent intentional conceptual links, not every hyperlink.
</Callout>
```

Supported callout types:

```txt
note
intuition
warning
example
definition
```

### 15.2 `Theorem`

```mdx
<Theorem title="Generalization bound" label="thm:generalization">
Let \(\mathcal{F}\) be ...
</Theorem>
```

No automatic theorem numbering in v1.

### 15.3 `Proof`

```mdx
<Proof>
By concentration of measure...
</Proof>
```

Default ending may include a square `□`.

### 15.4 `MathBlock`

For highlighted mathematical definitions, assumptions, or takeaways.

```mdx
<MathBlock title="Definition: Risk">
\[
R(f)=\mathbb{E}_{(X,Y)\sim P}[\ell(f(X),Y)]
\]
</MathBlock>
```

### 15.5 `Figure` and `Picture`

```mdx
<Figure
  src="/figures/model.png"
  alt="Model architecture"
  caption="A schematic view of the architecture."
/>
```

`Picture` must support:

```ts
type PictureProps = {
  src?: string;
  alt: string;
  invertInDarkMode?: boolean;
  lightSrc?: string;
  darkSrc?: string;
};
```

Priority:

```txt
1. if lightSrc/darkSrc exist, use theme-specific asset
2. else if invertInDarkMode, apply CSS filter in dark mode
3. else render src normally
```

### 15.6 `Aside`

```mdx
<Aside>
This is a margin note on desktop and inline note on mobile.
</Aside>
```

### 15.7 `BibtexBlock`

Purely presentational. It must not query `publications.bib`.

````mdx
<BibtexBlock>
```bibtex
@inproceedings{example2026,
  title = {Example Paper},
  author = {Your Name},
  year = {2026}
}
```
</BibtexBlock>
````

Features:

```txt
BibTeX syntax highlighting
copy button
optional collapsed/expanded state if straightforward
```

---

## 16. Math System

Use KaTeX for v1.

Requirements:

```txt
inline math
display math
build-time rendering
LaTeX macros file
```

Recommended stack:

```txt
remark-math
rehype-katex
KaTeX CSS
src/lib/math/macros.ts
```

Support Markdown math syntax:

```md
Inline math: \( f(x)=x^2 \)

Display math:

\[
R(f)=\mathbb{E}_{(X,Y)\sim P}[\ell(f(X),Y)]
\]
```

Architecture should isolate math rendering enough that `themeConfig.math.renderer` could exist conceptually, but only KaTeX needs implementation.

---

## 17. Publications System

Route:

```txt
/publications
```

Source:

```txt
src/data/publications.bib
```

No per-publication files and no publication override YAML.

The publications page should parse the single BibTeX file and render a publication list similar in spirit to al-folio.

Supported ordinary fields:

```txt
title
author
year
journal
booktitle
publisher
volume
number
pages
doi
url
```

Supported display fields:

```txt
abbr
abstract
arxiv
html
pdf
code
blog
slides
poster
video
website
selected
preview
bibtex_show
```

Publication page behavior:

```txt
grouping configurable, default by year descending
author highlighting supported via config
BibTeX button shown only if bibtex_show = {true}
preview thumbnails supported
```

Publication asset convention:

```txt
public/publications/
  example-preview.png
  example-paper.pdf
```

BibTeX example:

```bibtex
@inproceedings{example2026,
  title        = {Example Paper Title},
  author       = {Your Name and Coauthor Name},
  booktitle    = {Conference Name},
  year         = {2026},
  selected     = {true},
  bibtex_show  = {true},
  preview      = {example-preview.png},
  pdf          = {/publications/example-paper.pdf},
  arxiv        = {2601.00000},
  code         = {https://github.com/...},
  blog         = {/writing/example-paper},
  slides       = {/publications/example-slides.pdf}
}
```

Preview resolution:

```txt
preview = {example-preview.png} → /publications/example-preview.png
absolute URLs and absolute paths pass through unchanged
```

Homepage selected publications:

```txt
selected = {true}
```

controls eligibility for selected-publications homepage section when enabled.

---

## 18. Homepage

Source model:

```txt
identity/nav/social links in config
prose sections in src/content/pages/home.mdx
```

Default homepage sections are all enabled in the template to showcase features:

```txt
hero
research summary
writing preview
selected publications
recent writing
news
footer
```

Homepage should remain academic-first.

Recommended order:

```txt
Hero
Research summary
Explore Writing preview
Selected publications
Recent writing
News
Footer
```

### 18.1 Writing preview

Implemented via `GraphPreview`.

Default:

```txt
placement: below hero
desktop: static graph
mobile: topic cards
filter: type hub
click target: /writing
```

Placement configurable:

```txt
hero
below-hero
custom
```

---

## 19. Custom Pages

Support custom MDX pages under:

```txt
src/content/pages/
```

Routing:

```txt
src/content/pages/research.mdx → /research
src/content/pages/foo/bar.mdx → /foo/bar
```

Custom pages:

```txt
are outside the writing graph
use PageLayout
can be linked from nav config
may use shared MDX/article components where appropriate
```

Astro files under `src/pages/` should also remain supported for users who want full control.

---

## 20. Theme and Styling

Styling stack:

```txt
Tailwind CSS + CSS variables/design tokens
```

Default aesthetic:

```txt
minimal academic
serif body text
sans-serif UI/nav
monospace code
Distill-like technical article pages
quiet palette
subtle borders
ample whitespace
```

Use CSS variable tokens:

```css
:root {
  --color-bg: #ffffff;
  --color-fg: #111111;
  --color-muted: #666666;
  --color-border: #dddddd;

  --color-accent: #3657d8;
  --color-accent-soft: #eef1ff;
  --color-danger: #b91c1c;

  --graph-hub: #111111;
  --graph-paper: #3657d8;
  --graph-post: #64748b;
  --graph-note: #71717a;
  --graph-teaching: #15803d;
  --graph-project: #9333ea;
  --graph-edge: #9ca3af;

  --font-body: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  --font-ui: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, monospace;

  --content-narrow: 720px;
  --content-distill: 860px;
  --content-wide: 1100px;
  --sidebar-width: 260px;
}
```

Dark mode:

```css
[data-theme="dark"] {
  --color-bg: #0b0b0c;
  --color-fg: #f5f5f5;
  --color-muted: #a1a1aa;
  --color-border: #27272a;

  --color-accent: #8ea2ff;
  --color-accent-soft: #1e2448;
}
```

Global theme behavior:

```ts
theme: {
  defaultMode: "system",
  allowToggle: true
}
```

Per-entry theme override:

```yaml
theme: global # global | system | light | dark
```

If `theme` is omitted, treat as `global`.

---

## 21. RSS, Sitemap, SEO

### 21.1 SEO

Global metadata from `siteConfig`:

```ts
site: {
  url: "https://example.com",
  title: "Your Name",
  description: "Academic website and linked research writing.",
  image: "/og-image.png"
}
```

Per-entry metadata:

```yaml
description: "..."
thumbnail: "/writing/example-preview.png"
```

Fallback order:

```txt
entry.description
entry.summary
site.description
```

### 21.2 RSS

RSS is configurable and enabled by default.

Route:

```txt
/writing/rss.xml
```

Default inclusion:

```txt
draft !== true
date exists
type ∈ [paper, post, note, teaching, project]
hub excluded by default
```

Config:

```ts
rss: {
  enabled: true,
  route: "/writing/rss.xml",
  includeTypes: ["paper", "post", "note", "teaching", "project"],
  excludeTypes: ["hub"]
}
```

### 21.3 Sitemap

Include sitemap generation via Astro sitemap integration.

Include:

```txt
/
/writing
/writing/[slug]
/publications
/custom MDX pages
```

Exclude drafts.

---

## 22. Validation

Validation should catch common template errors clearly.

Hard errors:

```txt
duplicate flattened slugs
missing title
missing type
invalid type
invalid date format
malformed config
BibTeX parse failure if /publications enabled
```

Warnings by default:

```txt
unresolved wikilinks
unresolved frontmatter links
missing summaries
empty graph
preview graph exceeds maxNodes
no selected publications when selected-publications section is enabled
```

Configurable unresolved link severity:

```ts
validation: {
  links: {
    unresolvedWikilinks: "warn",       // "warn" | "error" | "ignore"
    unresolvedFrontmatterLinks: "warn" // "warn" | "error" | "ignore"
  }
}
```

---

## 23. Scaffolding Script

Include `scripts/new-entry.ts`.

Package script:

```json
{
  "scripts": {
    "new:entry": "tsx scripts/new-entry.ts"
  }
}
```

Interactive mode:

```bash
npm run new:entry
```

CLI mode:

```bash
npm run new:entry -- --type paper --title "Chain-of-Thought Information"
```

Creates:

```txt
src/content/writing/papers/chain-of-thought-information.mdx
```

Default frontmatter:

```yaml
---
title: "Chain-of-Thought Information"
type: "paper"
date: "2026-05-12"
tags: []
links: []
draft: true
theme: global
---
```

The script must check for duplicate flattened slugs before writing.

Recommended type-to-directory mapping:

```txt
hub      → hubs/
paper    → papers/
post     → posts/
note     → notes/
teaching → teaching/
project  → projects/
```

---

## 24. Package Scripts and Tooling

Use npm in docs and CI. Scripts should remain compatible with pnpm/bun where possible.

Recommended scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "validate": "tsx scripts/validate.ts",
    "new:entry": "tsx scripts/new-entry.ts",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

Commit `package-lock.json`.

README and CI should use:

```bash
npm install
npm run dev
npm run build
```

CI install command:

```bash
npm ci
```

---

## 25. Example Content Requirements

Ship with enough example content to showcase all core features.

Required examples:

```txt
homepage
custom pages
publications.bib
selected publications
writing graph
hubs
paper explainer
note
teaching note
project note
wikilinks
frontmatter links
backlinks
local graph
Theorem
Proof
Callout
MathBlock
Figure/Picture
Aside
BibtexBlock
TableOfContents
publication preview image
homepage writing preview
news section
```

Example writing graph should include at least:

```txt
3 hub nodes
1 paper node
1 post/note node
1 teaching node
1 project node
several wikilinks
several frontmatter links
```

---

## 26. Deployment

README should document:

```txt
local development
production build
Vercel deployment
GitHub Pages deployment
custom domain notes
```

Mention compatibility with:

```txt
Netlify
Cloudflare Pages
static hosting generally
```

GitHub Pages docs must explain `site` and `base` configuration when deploying under a repository subpath.

---

## 27. Implementation Milestones

The coding agent should implement in this order:

### Milestone 1 — Astro scaffold, styling, config

Deliver:

```txt
Astro project
Tailwind + CSS variables
BaseLayout
Header/Footer
ThemeToggle
src/config/*
example homepage shell
```

### Milestone 2 — Content collections and routes

Deliver:

```txt
writing content collection
custom pages collection
/writing/[slug]
/custom pages route
flattened slug resolution
basic WritingEntryLayout
```

### Milestone 3 — Wikilinks and graph index

Deliver:

```txt
remark wikilink plugin
resolved wikilink rendering
unresolved red [[foo]] rendering
graph extraction from frontmatter links + wikilinks only
GraphIndex builder
backlinks/outgoing/neighborhood utilities
validation for duplicate slugs and unresolved links
```

### Milestone 4 — Graph UI

Deliver:

```txt
GraphBrowser
GraphPreview
LocalGraph
node type styling
hub labels always visible
URL state
focus/selected separation
dim mode
filter mode toggle
left topics / center graph / right preview layout
mobile topics-first behavior
```

### Milestone 5 — Publications

Deliver:

```txt
BibTeX parser
/publications page
year grouping default
author highlighting
BibTeX button only when bibtex_show = {true}
preview image support
selected publications homepage section
```

### Milestone 6 — MDX article components

Deliver:

```txt
Callout
Theorem
Proof
MathBlock
Figure
Picture
Aside
BibtexBlock
TableOfContents
Video
YouTubeVideo
TwoColumns
Comparison
ModelViewer
KaTeX math support
LaTeX macros
syntax highlighting
footnotes
```

### Milestone 7 — Homepage and custom pages polish

Deliver:

```txt
academic hero
home.mdx prose sections
writing preview widget
recent writing section
news section
custom MDX page rendering
navigation config
```

### Milestone 8 — DX scripts and validation

Deliver:

```txt
scripts/validate.ts
scripts/new-entry.ts
npm scripts
clear errors/warnings
README authoring docs
```

### Milestone 9 — RSS, sitemap, SEO, deployment docs

Deliver:

```txt
RSS feed
sitemap
SEO/Open Graph metadata
Vercel docs
GitHub Pages docs
```

### Milestone 10 — Example content and final polish

Deliver:

```txt
complete example graph
example publications.bib
example custom pages
example MDX components
responsive checks
build passes
```

---

## 28. Acceptance Criteria

The template is complete when all of the following pass.

### Build and routes

```txt
npm install works
npm run dev works
npm run build works
/ renders
/writing renders
/writing/[slug] renders
/publications renders
custom MDX pages render
RSS builds
sitemap builds
```

### Writing graph

```txt
frontmatter links create graph edges
wikilinks create graph edges
normal Markdown links do not create graph edges
resolved wikilinks render as links
unresolved wikilinks render as red [[foo]]
unresolved wikilinks warn/error according to config
backlinks derive only from graph edges
local graph appears according to config
```

### Slugs

```txt
subdirectories are supported
flattened slugs work
duplicate flattened slugs fail validation
aliases resolve wikilinks
```

### Graph UI

```txt
GraphBrowser uses left topics, center graph, right preview on desktop
node click updates preview pane
Open Entry button navigates to /writing/[slug]
hub click focuses graph
focus mode dim works
filter mode toggle works
URL query state works
mobile default is topics-first
GraphPreview appears on homepage according to config
LocalGraph uses configurable depth with default 1
```

### Publications

```txt
/publications renders from src/data/publications.bib
groups by year descending by default
author highlighting works
preview thumbnails work
BibTeX button appears only if bibtex_show = {true}
selected = {true} entries can appear on homepage
```

### Theme

```txt
global system/light/dark behavior works
theme toggle works when enabled
per-entry theme: global/system/light/dark works
Picture invertInDarkMode works
Picture lightSrc/darkSrc works
```

### MDX components

```txt
Callout renders
Theorem renders without auto-numbering
Proof renders
MathBlock renders
Figure/Picture render
Aside renders as margin note on desktop and inline on mobile
BibtexBlock syntax highlights and has copy button
TableOfContents works
Video/YouTubeVideo/TwoColumns/Comparison/ModelViewer work
KaTeX inline/display math works
LaTeX macros work
footnotes work
syntax highlighting works
```

### Developer experience

```txt
npm run validate works
npm run new:entry works interactively
npm run new:entry -- --type paper --title "..." works
new entries are created as draft MDX files
README explains setup, customization, authoring, graph links, publications, components, and deployment
```

---

## 29. README Requirements

README must include:

```txt
project overview
quickstart
local development
build and preview
configuration guide
editing identity/nav/theme
adding custom pages
adding writing entries
using hubs
using frontmatter links
using wikilinks
explaining graph semantics
configuring graph styles
using article components
adding publications to publications.bib
using selected publications
homepage customization
RSS/sitemap/SEO notes
Vercel deployment
GitHub Pages deployment
troubleshooting validation warnings
```

README should explicitly state:

```txt
Graph edges come only from frontmatter links and [[wikilinks]].
Markdown links are ordinary links and do not affect the graph.
```
