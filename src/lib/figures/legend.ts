import { escapeHtml } from "./escape";
import { DASH, colorToken, type LegendItem } from "./index";
import { texToHtml } from "./tex";

/**
 * The legend shared by <Chart> and <Diagram>, as HTML: below the figure,
 * left-aligned, no box. Labels may carry `$…$` TeX. Each label is one
 * element, so the item's flex gap never splits text from the math beside it.
 * Hidden from screen readers, which get the figure's alt text instead.
 */
export function renderLegend(items: readonly LegendItem[]): string {
  if (items.length === 0) return "";
  return `<ul class="figure-legend" aria-hidden="true">${items.map(renderItem).join("")}</ul>`;
}

const label = (text: string) => `<span class="figure-legend__label">${texToHtml(text)}</span>`;

function renderItem(item: LegendItem): string {
  const color = colorToken(item.color);
  if (item.key === "ramp") {
    const width = item.opacities.length * 12;
    const steps = item.opacities
      .map(
        (opacity, i) =>
          `<rect x="${i * 12 + 1}" y="0" width="10" height="10" rx="1.5" fill="${color}" fill-opacity="${opacity}"></rect>`
      )
      .join("");
    return (
      `<li class="figure-legend__ramp">${label(item.label)}<span>${escapeHtml(item.from)}</span>` +
      `<svg width="${width}" height="10" viewBox="0 0 ${width} 10">${steps}</svg>` +
      `<span>${escapeHtml(item.to)}</span></li>`
    );
  }
  return (
    `<li><svg width="16" height="10" viewBox="0 0 16 10" style="--tone: ${color}">${key(item, color)}</svg>` +
    `${label(item.label)}</li>`
  );
}

function key(item: Exclude<LegendItem, { key: "ramp" }>, color: string): string {
  switch (item.key) {
    case "line": {
      const dash = item.dashed === true ? DASH : item.dashed || "";
      return `<line x1="0" x2="16" y1="5" y2="5" stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${escapeHtml(dash)}"` : ""}></line>`;
    }
    case "dot":
      return `<circle cx="8" cy="5" r="4" fill="${color}"></circle>`;
    case "region":
      return `<rect x="3.5" y="0.5" width="9" height="9" rx="1.5" class="figure-legend__region"></rect>`;
    case "arrow":
      return (
        `<line x1="0" x2="10" y1="5" y2="5" stroke="${color}" stroke-width="1.25"></line>` +
        `<path d="M16,5L9,1.75L9,8.25Z" fill="${color}"></path>`
      );
    case "swatch":
      return `<rect x="3" y="0" width="10" height="10" rx="1.5" fill="${color}"></rect>`;
  }
}
