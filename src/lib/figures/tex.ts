import katex from "katex";
import { globalMathMacros } from "../../site/math";
import { resolveMathMacros } from "../math/resolve";
import { escapeHtml, unescapeHtml } from "./escape";

/**
 * Chart labels may carry inline TeX between `$…$`, rendered with KaTeX (the
 * same renderer and stylesheet as the posts' math, with the site's global
 * macros). Build time only.
 */

const macros = resolveMathMacros({ globalMacros: globalMathMacros });

/**
 * `$…$` is math, except that a `$` followed by a digit is a dollar amount
 * ("costs $5 to $10"), as in the posts' inline math.
 */
const TEX = /\$(?!\d)[^$]+\$/;
const TEX_PARTS = /(\$(?!\d)[^$]+\$)/;

export const hasTex = (text: string) => TEX.test(text);

/** Plain text stays text (escaped); each `$…$` becomes KaTeX HTML. */
export function texToHtml(text: string): string {
  return text
    .split(TEX_PARTS)
    .map((part) =>
      /^\$(?!\d)[^$]+\$$/.test(part)
        ? katex.renderToString(part.slice(1, -1), {
            throwOnError: false,
            output: "html",
            // A copy, since KaTeX writes \gdef definitions into it.
            macros: { ...macros }
          })
        : escapeHtml(part)
    )
    .join("");
}

/** Text without the TeX markup, for alt text and tooltips. */
export const texToPlain = (text: string) => text.replace(/\$(?!\d)([^$]+)\$/g, "$1");

/**
 * Swap Plot's SVG axis-label text for KaTeX HTML in a foreignObject at the
 * same position. Plot draws a centred x label on its baseline, and a centred
 * y label rotated, hanging from its anchor (`y="0.71em"`).
 */
export function renderTexAxisLabels(svg: string, width: number): string {
  return svg.replace(
    /(<g[^>]*aria-label="(?:x|y|fx|fy)-axis label"[^>]*>)<text([^>]*)>([^<]*)<\/text>/g,
    (match, group: string, attributes: string, content: string) => {
      const label = unescapeHtml(content);
      if (!hasTex(label)) return match;
      const transform = /transform="([^"]*)"/.exec(attributes)?.[1] ?? "";
      const hanging = /y="0\.71em"/.test(attributes);
      const anchor = /text-anchor="(start|end)"/.exec(group + attributes)?.[1] ?? "middle";
      const box = width * 2;
      const x = anchor === "start" ? 0 : anchor === "end" ? -box : -box / 2;
      const y = hanging ? -2 : -17;
      return (
        // Twice the chart's width, so it must let the pointer through to the
        // marks (and their hover tips) beneath it.
        `${group}<foreignObject class="figure-tex" transform="${transform}" x="${x}" y="${y}" width="${box}" height="24" pointer-events="none">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" class="figure-tex__label" data-anchor="${anchor}">${texToHtml(label)}</div>` +
        `</foreignObject>`
      );
    }
  );
}
