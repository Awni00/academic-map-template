import {
  writingConfig,
  type ArticleMode,
  type AsidePlacement,
  type EntryType,
  type PlacementGraph,
  type PlacementOverride,
  type PlacementRelated,
  type PlacementToc
} from "../../config";
import type { WritingEntryLike } from "../graph/types";

/**
 * Fully-resolved placement for one article. Computed once at render time
 * by `resolvePlacement(entry)`; the layout component consumes only this.
 */
export type ResolvedPlacement = {
  toc: { where: PlacementToc };
  localGraph: { where: PlacementGraph };
  related: { where: PlacementRelated; withLocalGraph: boolean };
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

/**
 * "Related" is footer-only now. Legacy side-rail values ("left", "right",
 * "sidebar") still parse and land in the footer; `npm run validate` warns.
 */
export function normalizeRelated(value: string | undefined): PlacementRelated | undefined {
  if (value === undefined || value === "none") return value;
  return "footer";
}

/**
 * Merge the three placement levels — global default, per-type override,
 * per-entry frontmatter override — into a single object. Partial overrides
 * are honoured.
 */
export function resolvePlacement(entry: WritingEntryLike): ResolvedPlacement {
  const type = entry.data.type as EntryType;
  const placementConfig = writingConfig.entryLayout.placement;
  const fromDefault = placementConfig.default as PlacementOverride;
  const fromType = (placementConfig.byType as Record<string, PlacementOverride>)[type] ?? {};
  const fromFrontmatter = entry.data.article?.placement ?? {};

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
    related: {
      where:
        normalizeRelated(fromFrontmatter.related?.where) ??
        normalizeRelated(fromType.related?.where) ??
        normalizeRelated(fromDefault.related?.where) ??
        "footer",
      withLocalGraph:
        fromFrontmatter.related?.withLocalGraph ??
        fromType.related?.withLocalGraph ??
        fromDefault.related?.withLocalGraph ??
        false
    }
  };
}

/**
 * Whether the page renders the "Related" list. The local graph draws the same
 * links, so by default the list shows only on pages without one.
 */
export function showRelatedList(placement: ResolvedPlacement): boolean {
  if (placement.related.where === "none") return false;
  return placement.localGraph.where === "none" || placement.related.withLocalGraph;
}

/**
 * Resolve the article presentation mode: per-entry frontmatter override
 * (`article.mode`) → byType → global default. Mode is a presentation axis
 * only; the entry type continues to drive graph styling and feed
 * inclusion, so an abstract-mode paper still renders as a paper node.
 */
export function resolveArticleMode(entry: WritingEntryLike): ArticleMode {
  const type = entry.data.type as EntryType;
  const cfg = writingConfig.entryLayout.mode;
  return (
    (entry.data.article?.mode as ArticleMode | undefined) ??
    (cfg.byType as Record<string, ArticleMode>)[type] ??
    cfg.default
  );
}

/**
 * Resolve the requested aside placement for an entry: frontmatter
 * (`article.asides`) → byType → default. The per-instance `<Aside
 * placement>` prop overrides this further at render time and is handled
 * by CSS via the `data-aside-placement` attribute.
 */
export function resolveAsides(entry: WritingEntryLike): AsidePlacement {
  const type = entry.data.type as EntryType;
  const cfg = writingConfig.entryLayout.asides;
  return (
    ((entry.data.article as { asides?: AsidePlacement } | undefined)?.asides) ??
    (cfg.byType as Record<string, AsidePlacement>)[type] ??
    cfg.default
  );
}

/**
 * Apply the auto-degrade rule for margin asides: they need a free right
 * gutter, so the TOC must not occupy the right rail. Otherwise fall back
 * to inline.
 */
export function effectiveAsides(
  requested: AsidePlacement,
  toc: PlacementToc
): AsidePlacement {
  if (requested !== "margin") return "inline";
  if (toc === "right") return "inline";
  return "margin";
}
