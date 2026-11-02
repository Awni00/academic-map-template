/**
 * A fade on the edge of a sideways-scrolling block that has more to show.
 *
 * Wide display math scrolls inside its own box rather than pushing the column
 * wider, but a scroll box clipped at a clean edge looks like the equation
 * simply ends there. This marks each such box with `data-overflow` — "end",
 * "start" or "both", the sides with hidden content — and the stylesheet masks
 * those edges. A mask, not an overlay, so the fade works on any background:
 * prose, callouts and statements alike. Toggle-figure tab bars and the BibTeX
 * block use it too.
 */

export type OverflowSides = "start" | "end" | "both" | null;

/** Which sides of a scroll box hide content. A pixel of slack absorbs rounding. */
export function overflowSides(scrollLeft: number, scrollWidth: number, clientWidth: number): OverflowSides {
  if (scrollWidth - clientWidth <= 1) return null;
  const start = scrollLeft > 1;
  const end = scrollLeft + clientWidth < scrollWidth - 1;
  if (start && end) return "both";
  if (start) return "start";
  if (end) return "end";
  return null;
}

function update(element: HTMLElement) {
  const sides = overflowSides(element.scrollLeft, element.scrollWidth, element.clientWidth);
  if (sides) element.dataset.overflow = sides;
  else delete element.dataset.overflow;
}

/** Watch every match of `selector` under `root`; safe to call more than once. */
export function wireOverflowHints(selector = ".katex-display", root: ParentNode = document) {
  const resize = "ResizeObserver" in window
    ? new ResizeObserver((entries) => entries.forEach((entry) => update(entry.target as HTMLElement)))
    : null;
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    if (element.dataset.overflowHint === "ready") continue;
    element.dataset.overflowHint = "ready";
    element.addEventListener("scroll", () => update(element), { passive: true });
    resize?.observe(element);
    update(element);
  }
}
