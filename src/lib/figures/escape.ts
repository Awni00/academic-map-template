/** Escape text for HTML content and double-quoted attributes. */
export { escapeHtml } from "../math/inlineMath";

/** The inverse of `escapeHtml`, for text read back out of serialised SVG. */
export const unescapeHtml = (text: string) =>
  text.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e]!
  );
