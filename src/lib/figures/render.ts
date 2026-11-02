import * as Plot from "@observablehq/plot";
import { autoType, csvParse } from "d3-dsv";
import { parseHTML } from "linkedom";
import { replaceColorSentinels, withSiteDefaults, type FigureRow } from "./index";
import { renderTexAxisLabels, texToPlain } from "./tex";

/**
 * Build-time chart rendering.
 *
 * Charts are drawn with Observable Plot when the page is built and inlined as
 * SVG, so they ship no JavaScript, use the page's fonts, and recolour with the
 * theme toggle. Plot needs a DOM to draw into; linkedom supplies one.
 */

export const parseFigureData = (csv: string): FigureRow[] => csvParse(csv, autoType) as FigureRow[];

export function renderFigure(options: Plot.PlotOptions, ariaLabel: string): string {
  const { document } = parseHTML("<!doctype html><html><body></body></html>");
  const node = Plot.plot({
    ...withSiteDefaults(options),
    ariaLabel: texToPlain(ariaLabel),
    document: document as unknown as Document
  });
  const svg = replaceColorSentinels((node as unknown as Element).outerHTML);
  return renderTexAxisLabels(svg, options.width ?? 640);
}
