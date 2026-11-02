/**
 * Whether a page's "Related" list would only repeat its "Linked from" list.
 *
 * `related` is drawn from the union of the pages this one links to and the
 * pages that link here, so when every outgoing link is reciprocated — the
 * usual shape of a hub, whose members link back to it — the two lists name
 * the same pages, and the second one is noise. Order does not matter, and an
 * empty `related` repeats nothing (there is no list to hide).
 */
export function relatedRepeatsLinkedFrom(
  related: ReadonlyArray<{ id: string }>,
  linkedFrom: ReadonlyArray<{ id: string }>
): boolean {
  if (related.length === 0) return false;
  const linked = new Set(linkedFrom.map((item) => item.id));
  return related.every((item) => linked.has(item.id));
}
