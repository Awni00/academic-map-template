import {
  writingConfig,
  type ArticleWidth,
  type AsidePlacement,
  type EntryType,
  type PlacementGraph,
  type PlacementNav,
  type PlacementSpec,
  type PlacementToc
} from "../../config/writing";
import type { WritingEntryLike } from "../graph/types";

/**
 * Fully-resolved placement for one article. Computed once at render time
 * by `resolvePlacement(entry)`; the layout component consumes only this.
 */
export type ResolvedPlacement = {
  toc: { where: PlacementToc };
  localGraph: { where: PlacementGraph };
  backlinks: { where: PlacementNav };
  related: { where: PlacementNav };
};

/**
 * Legacy frontmatter values used "sidebar" before the left/right split.
 * Silently map any "sidebar" we see to "right" so old content keeps
 * rendering. The cost of keeping this is one tiny normaliser per field.
 */
function normalizeToc(value: string | undefined): PlacementToc | undefined {
  if (value === "sidebar") return "right";
  return value as PlacementToc | undefined;
}
function normalizeNav(value: string | undefined): PlacementNav | undefined {
  if (value === "sidebar") return "right";
  return value as PlacementNav | undefined;
}

/**
 * Merge the three placement levels — global default, per-type override,
 * per-entry frontmatter override — into a single object. Partial overrides
 * are honoured.
 */
export function resolvePlacement(entry: WritingEntryLike): ResolvedPlacement {
  const type = entry.data.type as EntryType;
  const placementConfig = writingConfig.entryLayout.placement;
  const fromDefault = placementConfig.default as Partial<PlacementSpec>;
  const fromType = (placementConfig.byType as Record<string, Partial<PlacementSpec>>)[type] ?? {};
  const fromFrontmatter = entry.data.layout?.placement ?? {};

  return {
    toc: {
      where:
        normalizeToc(fromFrontmatter.toc?.where) ??
        fromType.toc?.where ??
        fromDefault.toc?.where ??
        "left"
    },
    localGraph: {
      where:
        (fromFrontmatter.localGraph?.where as PlacementGraph | undefined) ??
        fromType.localGraph?.where ??
        fromDefault.localGraph?.where ??
        "footer"
    },
    backlinks: {
      where:
        normalizeNav(fromFrontmatter.backlinks?.where) ??
        fromType.backlinks?.where ??
        fromDefault.backlinks?.where ??
        "footer"
    },
    related: {
      where:
        normalizeNav(fromFrontmatter.related?.where) ??
        fromType.related?.where ??
        fromDefault.related?.where ??
        "footer"
    }
  };
}

/** True iff any section is placed in the given slot. */
export function hasSlot(
  placement: ResolvedPlacement,
  slot: PlacementToc | PlacementGraph | PlacementNav
): boolean {
  return Object.values(placement).some((section) => section.where === slot);
}

/**
 * Resolve the article body width: per-entry frontmatter override
 * (`layout.width`) → byType → global default.
 */
export function resolveArticleWidth(entry: WritingEntryLike): ArticleWidth {
  const type = entry.data.type as EntryType;
  const widthCfg = writingConfig.entryLayout.articleWidth;
  return (
    (entry.data.layout?.width as ArticleWidth | undefined) ??
    (widthCfg.byType as Record<string, ArticleWidth>)[type] ??
    widthCfg.default
  );
}

/**
 * Resolve the requested aside placement for an entry: frontmatter
 * (`layout.asides`) → byType → default. The per-instance `<Aside
 * placement>` prop overrides this further at render time and is handled
 * by CSS via the `data-aside-placement` attribute.
 */
export function resolveAsides(entry: WritingEntryLike): AsidePlacement {
  const type = entry.data.type as EntryType;
  const cfg = writingConfig.entryLayout.asides;
  return (
    ((entry.data.layout as { asides?: AsidePlacement } | undefined)?.asides) ??
    (cfg.byType as Record<string, AsidePlacement>)[type] ??
    cfg.default
  );
}

/**
 * Apply the auto-degrade rule for margin asides: they need a free right
 * gutter, which means the article must use the reading-width column AND
 * the TOC must not occupy the right rail. Otherwise fall back to inline.
 */
export function effectiveAsides(
  requested: AsidePlacement,
  articleWidth: ArticleWidth,
  toc: PlacementToc
): AsidePlacement {
  if (requested !== "margin") return "inline";
  if (articleWidth !== "reading") return "inline";
  if (toc === "right") return "inline";
  return "margin";
}
