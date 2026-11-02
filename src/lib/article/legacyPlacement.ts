/**
 * Placement keys that still parse but no longer do what they say: the
 * "Linked from" list was folded into "Related", and "Related" is footer-only.
 * Returns one message per stale key, each prefixed with `where` (e.g. an
 * entry id or a config path).
 */
export function legacyPlacementWarnings(placement: unknown, where: string): string[] {
  if (!placement || typeof placement !== "object") return [];
  const value = placement as { linkedFrom?: unknown; related?: { where?: unknown } };
  const warnings: string[] = [];
  if (value.linkedFrom !== undefined) {
    warnings.push(
      `${where}: placement.linkedFrom is no longer used and is ignored; the "Related" list now covers links in both directions.`
    );
  }
  const relatedWhere = value.related?.where;
  if (relatedWhere === "left" || relatedWhere === "right" || relatedWhere === "sidebar") {
    warnings.push(
      `${where}: placement.related.where "${relatedWhere}" is no longer supported and renders as "footer"; use "footer" or "none".`
    );
  }
  return warnings;
}
