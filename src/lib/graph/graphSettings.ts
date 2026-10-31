import type { GraphConfigBase, GraphForcesConfig, GraphHoverConfig } from "../../config/types";

const HOVER_LABELS = ["node", "neighbours", "none"] as const;

/** Strengths are fractions; anything above 1 overshoots and the layout shakes. */
const FRACTIONS: readonly (keyof GraphForcesConfig)[] = ["groupPull", "crossLinkStrength", "centerPull"];

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
  config: Pick<GraphConfigBase, "links" | "layout" | "hover">,
  homepageHover?: Partial<GraphHoverConfig>
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

  const forces = config.layout.forces;
  for (const [key, value] of Object.entries(forces) as [keyof GraphForcesConfig, unknown][]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      errors.push(`graph.layout.forces.${key} must be a number of 0 or more, got ${JSON.stringify(value)}.`);
    } else if (FRACTIONS.includes(key) && value > 1) {
      errors.push(`graph.layout.forces.${key} is ${value}; it is a strength between 0 and 1.`);
    }
  }

  const { width, opacity, curvature } = config.links;
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
