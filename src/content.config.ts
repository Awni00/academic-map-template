import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

import { entryTypeIds } from "./config";

const entryTypes = entryTypeIds as [string, ...string[]];

const requiredDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const dateString = requiredDateString.optional();

const displayDate = z.object({
  label: z.string().min(1),
  date: requiredDateString
});

const tocDepth = z.number().int().min(2).max(6);

const tocConfig = z
  .object({
    minDepth: tocDepth.optional(),
    maxDepth: tocDepth.optional()
  })
  .refine(
    (value) =>
      value.minDepth === undefined ||
      value.maxDepth === undefined ||
      value.minDepth <= value.maxDepth,
    {
      message: "minDepth must be less than or equal to maxDepth",
      path: ["maxDepth"]
    }
  );

const mathConfig = z.object({
  macros: z.array(z.string()).default([])
});

const externalLinks = z
  .object({
    paper: z.string().url().or(z.string().startsWith("/")).optional(),
    arxiv: z.string().optional(),
    doi: z.string().optional(),
    code: z.string().url().or(z.string().startsWith("/")).optional(),
    slides: z.string().url().or(z.string().startsWith("/")).optional(),
    poster: z.string().url().or(z.string().startsWith("/")).optional(),
    website: z.string().url().or(z.string().startsWith("/")).optional(),
    video: z.string().url().or(z.string().startsWith("/")).optional()
  })
  .partial()
  .optional();

const hero = z
  .object({
    src: z.string().url().or(z.string().startsWith("/")),
    alt: z.string().default(""),
    caption: z.string().optional()
  })
  .optional();

const writing = defineCollection({
  loader: glob({
    base: "./src/content/writing",
    pattern: "**/*.{md,mdx}",
    retainBody: true
  }),
  schema: z.object({
    title: z.string(),
    type: z.enum(entryTypes),
    slug: z.string().optional(),
    aliases: z.array(z.string()).default([]),
    date: dateString,
    displayDates: z.array(displayDate).min(1).optional(),
    updated: dateString,
    summary: z.string().optional(),
    venue: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]),
    authors: z
      .array(
        z.union([
          z.string(),
          z.object({
            name: z.string(),
            affiliation: z.string().optional(),
            url: z.string().url().optional(),
            note: z.string().optional()
          })
        ])
      )
      .default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    theme: z.enum(["global", "system", "light", "dark"]).default("global"),
    math: mathConfig.optional(),
    external: externalLinks,
    bibtex: z.string().optional(),
    // Optional figure rendered alongside the article body. Available in
    // both presentation modes; article mode leads with it, abstract mode
    // places it after the abstract.
    hero,
    // Per-entry presentation overrides. Mirrors the entry-type registry's
    // `article` block, so the same keys mean the same thing at both levels.
    //
    // NOTE: this must not be named `layout`. Astro reserves `frontmatter.layout`
    // as a path to a layout component and emits
    //   import __astro_layout_component__ from <value>
    // which is a syntax error for any object value.
    article: z
      .object({
        // Presentation mode. "abstract" renders a short paper-record page
        // whose body is the abstract itself, emphasized as a block; the
        // default "article" is the standard long-form layout. This only
        // affects presentation — `type` still drives graph styling, RSS,
        // and recent-writing inclusion.
        mode: z.enum(["article", "abstract"]).optional(),
        // Override aside placement: "margin" floats <Aside> blocks into
        // the right gutter; "inline" renders them as left-bordered blocks.
        asides: z.enum(["margin", "inline"]).optional(),
        // Override which heading depths appear in the article TOC.
        // Depths are h2-h6; h1 is reserved for the article title.
        toc: tocConfig.optional(),
        // Structured placement overrides — partial; fields you omit fall
        // through to the type-level or global default. Legacy "sidebar"
        // value is accepted and silently mapped to "right".
        placement: z
          .object({
            toc: z
              .object({ where: z.enum(["left", "right", "sidebar", "none"]).optional() })
              .optional(),
            localGraph: z
              .object({ where: z.enum(["header", "footer", "none"]).optional() })
              .optional(),
            backlinks: z
              .object({ where: z.enum(["left", "right", "footer", "sidebar", "none"]).optional() })
              .optional(),
            related: z
              .object({ where: z.enum(["left", "right", "footer", "sidebar", "none"]).optional() })
              .optional()
          })
          .optional()
      })
      .optional()
  })
});

const pages = defineCollection({
  loader: glob({
    base: "./src/content/pages",
    pattern: "**/*.{md,mdx}",
    retainBody: true
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    math: mathConfig.optional(),
    navTitle: z.string().optional()
  })
});

export const collections = { pages, writing };
