import * as Plot from "@observablehq/plot";
import { COLOR_TOKENS, withSiteDefaults } from "./index";

/**
 * Browser-side chart rendering, for interactive figures that redraw (a slider,
 * a toggle, an animation frame). Same output as the build-time renderer: site
 * defaults, and series sentinels swapped for theme variables.
 */
export function renderFigureInBrowser(options: Plot.PlotOptions, ariaLabel: string): Element {
  const node = Plot.plot({ ...withSiteDefaults(options), ariaLabel }) as Element;
  const attributes = ["fill", "stroke", "style"];
  for (const el of [node, ...node.querySelectorAll("*")]) {
    for (const name of attributes) {
      const value = el.getAttribute(name);
      if (!value) continue;
      let next = value;
      for (const [sentinel, token] of Object.entries(COLOR_TOKENS)) next = next.replaceAll(sentinel, token);
      if (next !== value) el.setAttribute(name, next);
    }
  }
  return node;
}
