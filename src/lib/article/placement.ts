import {
  writingConfig,
  type EntryType,
  type PlacementGraph,
  type PlacementNav,
  type PlacementSpec,
  type PlacementToc,
  type TocStyle
} from "../../config/writing";
import type { WritingEntryLike } from "../graph/types";

/**
 * Fully-resolved placement for one article. Computed once at render time
 * by `resolvePlacement(entry)`; the layout component consumes only this.
 */
export type ResolvedPlacement = {
  toc: { where: PlacementToc; style: TocStyle };
  localGraph: { where: PlacementGraph };
  backlinks: { where: PlacementNav };
  related: { where: PlacementNav };
};

/**
 * Merge the three placement levels — global default, per-type override,
 * per-entry frontmatter override — into a single object. Partial overrides
 * are honoured (e.g. frontmatter `{ toc: { style: "text" } }` keeps the
 * `where` value from the previous level).
 *
 * Legacy frontmatter flags (`layout.sidebar`, `layout.localGraph`,
 * `layout.toc`) are folded in last so old content continues to work:
 *   - `sidebar: false` → forces all `*.where = "sidebar"` to "none"
 *     (effectively collapsing the right rail).
 *   - `toc: false` → forces TOC to "none".
 *   - `localGraph: false` → forces the LocalGraph to "none".
 *
 * Global feature flags from `writingConfig.entryLayout` are also honoured:
 *   - `sidebar.byType[type] === false` collapses the rail.
 *   - `localGraph.enabled === false` or
 *     `localGraph.byType[type] === false` forces graph to "none".
 */
export function resolvePlacement(entry: WritingEntryLike): ResolvedPlacement {
  const type = entry.data.type as EntryType;
  const placementConfig = writingConfig.entryLayout.placement;
  const fromDefault = placementConfig.default as Partial<PlacementSpec>;
  const fromType = (placementConfig.byType as Record<string, Partial<PlacementSpec>>)[type] ?? {};
  const fromFrontmatter = entry.data.layout?.placement ?? {};

  // Merge field-by-field. Each level can supply a partial; we deep-merge
  // the inner object so `style` and `where` are settable independently.
  const resolved: ResolvedPlacement = {
    toc: {
      where:
        fromFrontmatter.toc?.where ??
        fromType.toc?.where ??
        fromDefault.toc?.where ??
        "sidebar",
      style:
        fromFrontmatter.toc?.style ??
        fromType.toc?.style ??
        fromDefault.toc?.style ??
        "strip"
    },
    localGraph: {
      where:
        fromFrontmatter.localGraph?.where ??
        fromType.localGraph?.where ??
        fromDefault.localGraph?.where ??
        "footer"
    },
    backlinks: {
      where:
        fromFrontmatter.backlinks?.where ??
        fromType.backlinks?.where ??
        fromDefault.backlinks?.where ??
        "footer"
    },
    related: {
      where:
        fromFrontmatter.related?.where ??
        fromType.related?.where ??
        fromDefault.related?.where ??
        "footer"
    }
  };

  // Apply legacy feature flags. These can only *demote* (never promote).
  const legacy = entry.data.layout ?? {};
  const sidebarEnabled =
    legacy.sidebar ??
    (writingConfig.entryLayout.sidebar.byType as Record<string, boolean>)[type] ??
    writingConfig.entryLayout.sidebar.default;
  if (sidebarEnabled === false) {
    if (resolved.toc.where === "sidebar") resolved.toc.where = "none";
    if (resolved.backlinks.where === "sidebar") resolved.backlinks.where = "footer";
    if (resolved.related.where === "sidebar") resolved.related.where = "footer";
  }
  if (legacy.toc === false) resolved.toc.where = "none";

  const graphEnabled =
    legacy.localGraph ??
    ((writingConfig.entryLayout.localGraph.byType as Record<string, boolean>)[type] ??
      writingConfig.entryLayout.localGraph.enabled);
  if (graphEnabled === false) resolved.localGraph.where = "none";

  return resolved;
}

/** True iff any section is placed in the given slot. */
export function hasSlot(
  placement: ResolvedPlacement,
  slot: "sidebar" | "header" | "footer"
): boolean {
  return Object.values(placement).some((section) => section.where === slot);
}
