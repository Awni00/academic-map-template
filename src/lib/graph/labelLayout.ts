/**
 * Line breaking and placement for the titles painted on a graph canvas.
 *
 * Titles here are often paper titles — a dozen words — and a canvas has no
 * text layout of its own: `fillText` draws one line however long it is, so a
 * long title ran off the side of the map or straight through its neighbours.
 * These helpers decide where the lines break and where the block sits. They
 * take a `measure` function rather than a canvas, so they can be tested with
 * plain arithmetic.
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };

const ELLIPSIS = "…";

function greedy(words: string[], measure: (text: string) => number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Shorten `text` until it, plus an ellipsis, fits `width`. */
function truncate(text: string, measure: (text: string) => number, width: number): string {
  if (measure(text) <= width) return text;
  let cut = text;
  while (cut.length > 1 && measure(`${cut}${ELLIPSIS}`) > width) {
    cut = cut.slice(0, -1);
  }
  return `${cut.replace(/[\s,;:–—-]+$/, "")}${ELLIPSIS}`;
}

/**
 * Break `text` into at most `maxLines` lines no wider than `maxWidth`.
 *
 * Balanced, not greedy: once the number of lines is known, the width is
 * narrowed as far as it can go without adding a line, so a two-line title
 * splits near its middle instead of leaving one word stranded on the second
 * line. Text that needs more lines than allowed ends in an ellipsis. A single
 * word wider than `maxWidth` is truncated rather than overflowing.
 */
export function wrapLabel(
  text: string,
  measure: (text: string) => number,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  let lines = greedy(words, measure, maxWidth);

  if (lines.length <= maxLines) {
    let lo = 0;
    let hi = maxWidth;
    for (let step = 0; step < 16; step += 1) {
      const mid = (lo + hi) / 2;
      if (greedy(words, measure, mid).length <= lines.length) hi = mid;
      else lo = mid;
    }
    lines = greedy(words, measure, hi);
  } else {
    const kept = lines.slice(0, maxLines);
    const rest = lines.slice(maxLines - 1).join(" ");
    kept[maxLines - 1] = truncate(`${rest}`, measure, maxWidth);
    // `truncate` only adds an ellipsis when it cuts; the overflow always cut.
    if (!kept[maxLines - 1].endsWith(ELLIPSIS)) kept[maxLines - 1] += ELLIPSIS;
    lines = kept;
  }
  return lines.map((line) => truncate(line, measure, maxWidth));
}

/** Whether `box` sits inside `view` vertically, `margin` clear of its edges. */
function fitsView(box: Box, view: Box, margin: number): boolean {
  return box.y0 >= view.y0 + margin && box.y1 <= view.y1 - margin;
}

/**
 * Where a label block of `width` × `height` goes beside a node: centred above
 * it (below, with `prefer`), `gap` clear of the glyph, slid sideways to stay
 * inside `view`, and on the other side when only that one fits. With `taken`,
 * a position that overlaps an existing label, or runs off the canvas, is
 * refused and the other side tried; `null` means neither side is free.
 */
export function placeLabel(
  node: { x: number; y: number },
  size: { width: number; height: number },
  options: { radius: number; gap: number; margin: number; view: Box; prefer?: "above" | "below"; taken?: Box[] }
): Box | null {
  const { radius, gap, margin, view, taken } = options;
  const half = size.width / 2;
  const minX = view.x0 + margin + half;
  const maxX = view.x1 - margin - half;
  const cx = minX > maxX ? (view.x0 + view.x1) / 2 : Math.min(maxX, Math.max(minX, node.x));
  const above: Box = {
    x0: cx - half,
    x1: cx + half,
    y1: node.y - radius - gap,
    y0: node.y - radius - gap - size.height
  };
  const below: Box = {
    x0: cx - half,
    x1: cx + half,
    y0: node.y + radius + gap,
    y1: node.y + radius + gap + size.height
  };
  const fits = (box: Box) => fitsView(box, view, margin);
  const [first, second] = options.prefer === "below" ? [below, above] : [above, below];
  const order = fits(first) || !fits(second) ? [first, second] : [second, first];
  if (!taken) return order[0];
  for (const box of order) {
    if (fits(box) && !taken.some((other) => overlaps(box, other))) return box;
  }
  return null;
}

/**
 * Where a label that must always be shown (a hub's) goes: as `placeLabel`
 * puts it, but clear of `blocked` — whatever is painted over the canvas, like
 * the legend — when either side of the node is. When neither is, it goes where
 * it would have anyway: half-covered is better than missing.
 */
export function placeRequiredLabel(
  node: { x: number; y: number },
  size: { width: number; height: number },
  options: Omit<Parameters<typeof placeLabel>[2], "taken">,
  blocked: readonly Box[]
): Box {
  const clear = blocked.length ? placeLabel(node, size, { ...options, taken: [...blocked] }) : null;
  return clear ?? (placeLabel(node, size, options) as Box);
}

/**
 * Where a label that must be shown goes when no side of its node is clear of
 * `avoid`: as `placeRequiredLabel` puts it, unless the other side, still inside
 * `view`, covers fewer of `avoid`. A hovered title over one glyph is better
 * than the same title over two.
 */
export function placeLeastCovering(
  node: { x: number; y: number },
  size: { width: number; height: number },
  options: Omit<Parameters<typeof placeLabel>[2], "taken">,
  avoid: readonly Box[],
  blocked: readonly Box[]
): Box {
  const first = placeRequiredLabel(node, size, options, blocked);
  const flipped = placeRequiredLabel(
    node,
    size,
    { ...options, prefer: options.prefer === "below" ? "above" : "below" },
    blocked
  );
  const inView = fitsView(flipped, options.view, options.margin);
  const cost = (box: Box) => avoid.filter((other) => overlaps(box, other)).length;
  return inView && cost(flipped) < cost(first) ? flipped : first;
}

/**
 * A rectangle in CSS pixels over a canvas, in the units of the canvas's
 * current transform (`a`, `d` scale and `e`, `f` offset, as `getTransform`
 * gives them, in device pixels; `dpr` device pixels per CSS pixel).
 */
export function screenToGraph(
  box: Box,
  transform: { a: number; d: number; e: number; f: number },
  dpr: number
): Box {
  const { a, d, e, f } = transform;
  return {
    x0: (box.x0 * dpr - e) / a,
    x1: (box.x1 * dpr - e) / a,
    y0: (box.y0 * dpr - f) / d,
    y1: (box.y1 * dpr - f) / d
  };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
