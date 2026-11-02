import { renderInlineMarkdown } from "../../lib/article/inlineMarkdown";
import { resolveMathMacros } from "../../lib/math/resolve";
import { globalMathMacros } from "../../site/math";

const macros = resolveMathMacros({ globalMacros: globalMathMacros });

/**
 * A `caption="…"` prop as HTML, with the inline Markdown the caption slot
 * would get from MDX. Escaped, so it is safe for `set:html`.
 */
export function renderCaption(caption: string): string {
  return renderInlineMarkdown(caption, macros);
}
