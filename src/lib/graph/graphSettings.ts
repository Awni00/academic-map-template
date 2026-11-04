import type {
  GraphArrows,
  GraphConfigBase,
  GraphForcesConfig,
  GraphHoverConfig
} from "../../config/types";

const HOVER_LABELS = ["node", "neighbours", "none"] as const;
const SELECTION_STYLES = ["halo", "ring"] as const;
const ARROW_MODES = ["never", "always", "highlighted"] as const;

/**
 * Which edges carry arrowheads: `links.arrows` when set, otherwise the older
 * `links.directed` switch (true meaning "always").
 */
export function arrowMode(links: Pick<GraphConfigBase["links"], "arrows" | "directed">): GraphArrows {
  return links.arrows ?? (links.directed ? "always" : "never");
}

/** Strengths are fractions; anything above 1 overshoots and the layout shakes. */
const FRACTIONS: readonly (keyof GraphForcesConfig)[] = [
  "groupPull",
  "crossLinkStrength",
  "hubLinkStrength",
  "centerPull"
];

/**
 * The hover behaviour for one map: the site-wide `graph.hover`, with any
 * fields that map overrides.
 */
export function resolveHover(
  base: GraphHoverConfig,
  override?: Partial<GraphHoverConfig>
): GraphHoverConfig {
  return { ...base, ...(override ?? {}) };
}

/**
 * Problems with the hover, force, and edge settings, as messages naming the
 * setting. An empty list means the config is usable.
 *
 * Each of these numbers goes straight into the simulation, where a typo is not
 * an error but a map that flies apart or collapses to a point, with nothing to
 * say why. Checked here instead, the build stops and names the setting.
 */
export function validateGraphSettings(
  config: Pick<GraphConfigBase, "links" | "layout" | "hover"> & Partial<Pick<GraphConfigBase, "selection">>,
  homepageHover?: Partial<GraphHoverConfig>,
  localGraphHover?: Partial<GraphHoverConfig>
): string[] {
  const errors: string[] = [];
  const checkHover = (hover: Partial<GraphHoverConfig> | undefined, path: string) => {
    if (!hover) return;
    if (hover.labels !== undefined && !HOVER_LABELS.includes(hover.labels)) {
      errors.push(
        `${path}.labels is ${JSON.stringify(hover.labels)}; use one of ${HOVER_LABELS.map((value) => `"${value}"`).join(", ")}.`
      );
    }
    if (hover.dim !== undefined && typeof hover.dim !== "boolean") {
      errors.push(`${path}.dim must be true or false, got ${JSON.stringify(hover.dim)}.`);
    }
  };
  checkHover(config.hover, "graph.hover");
  checkHover(homepageHover, "site.homepage.writingPreview.hover");
  checkHover(localGraphHover, "writing.entryLayout.localGraph.hover");

  const style = config.selection?.style;
  if (style !== undefined && !SELECTION_STYLES.includes(style)) {
    errors.push(
      `graph.selection.style is ${JSON.stringify(style)}; use one of ${SELECTION_STYLES.map((value) => `"${value}"`).join(", ")}.`
    );
  }

  const forces = config.layout.forces;
  for (const [key, value] of Object.entries(forces) as [keyof GraphForcesConfig, unknown][]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      errors.push(`graph.layout.forces.${key} must be a number of 0 or more, got ${JSON.stringify(value)}.`);
    } else if (FRACTIONS.includes(key) && value > 1) {
      errors.push(`graph.layout.forces.${key} is ${value}; it is a strength between 0 and 1.`);
    }
  }

  const { width, opacity, curvature, arrows, arrow } = config.links;
  if (arrows !== undefined && !ARROW_MODES.includes(arrows)) {
    errors.push(
      `graph.links.arrows is ${JSON.stringify(arrows)}; use one of ${ARROW_MODES.map((value) => `"${value}"`).join(", ")}.`
    );
  }
  for (const key of ["length", "width"] as const) {
    const value = arrow?.[key];
    if (typeof value !== "number" || !(value > 0)) {
      errors.push(`graph.links.arrow.${key} must be a positive number of pixels, got ${JSON.stringify(value)}.`);
    }
  }
  if (typeof width !== "number" || !(width > 0)) {
    errors.push(`graph.links.width must be a positive number of pixels, got ${JSON.stringify(width)}.`);
  }
  if (typeof opacity !== "number" || opacity < 0 || opacity > 1) {
    errors.push(`graph.links.opacity must be between 0 and 1, got ${JSON.stringify(opacity)}.`);
  }
  if (typeof curvature !== "number" || curvature < 0 || curvature > 0.5) {
    errors.push(`graph.links.curvature must be between 0 (straight) and 0.5, got ${JSON.stringify(curvature)}.`);
  }
  return errors;
}
