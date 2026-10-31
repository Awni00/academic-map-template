import { describe, expect, it } from "vitest";

import { graphConfig } from "../../src/config";
import { defaultGraphConfig } from "../../src/config/defaults/graph";
import { resolveHover, validateGraphSettings } from "../../src/lib/graph/graphSettings";
import { siteConfigOverrides } from "../../src/site/config";

const base = {
  links: { ...defaultGraphConfig.links },
  layout: { ...defaultGraphConfig.layout, forces: { ...defaultGraphConfig.layout.forces } },
  hover: { ...defaultGraphConfig.hover }
};

describe("validateGraphSettings", () => {
  it("accepts the defaults", () => {
    expect(validateGraphSettings(base, { labels: "node" })).toEqual([]);
  });

  it("names an unknown hover label setting", () => {
    const errors = validateGraphSettings({ ...base, hover: { labels: "all" as any, dim: true } });
    expect(errors.join("\n")).toMatch(/graph\.hover\.labels/);
  });

  it("checks the homepage override too", () => {
    const errors = validateGraphSettings(base, { dim: "yes" as any });
    expect(errors.join("\n")).toMatch(/writingPreview\.hover\.dim/);
  });

  it("rejects negative or non-numeric forces, and strengths above 1", () => {
    const forces = { ...base.layout.forces, minGap: -1, hubRepulsion: "lots" as any, groupPull: 3 };
    const errors = validateGraphSettings({ ...base, layout: { ...base.layout, forces } }).join("\n");
    expect(errors).toMatch(/forces\.minGap/);
    expect(errors).toMatch(/forces\.hubRepulsion/);
    expect(errors).toMatch(/forces\.groupPull/);
  });

  it("bounds edge width, opacity, and curvature", () => {
    const links = { ...base.links, width: 0, opacity: 2, curvature: 0.9 };
    const errors = validateGraphSettings({ ...base, links }).join("\n");
    expect(errors).toMatch(/links\.width/);
    expect(errors).toMatch(/links\.opacity/);
    expect(errors).toMatch(/links\.curvature/);
  });
});

describe("resolveHover", () => {
  it("overrides only the fields given", () => {
    expect(resolveHover({ labels: "neighbours", dim: true }, { labels: "node" })).toEqual({
      labels: "node",
      dim: true
    });
    expect(resolveHover({ labels: "neighbours", dim: true })).toEqual({ labels: "neighbours", dim: true });
  });
});

describe("resolved graph config", () => {
  // Compared with the defaults merged with the site's own overrides, so the
  // test holds whatever a site has set in src/site/config.ts.
  const site = siteConfigOverrides.graph;

  it("ships the documented defaults", () => {
    expect(defaultGraphConfig.hover).toEqual({ labels: "neighbours", dim: true });
    expect(defaultGraphConfig.layout.forces.groupDistance).toBe(36);
    expect(defaultGraphConfig.links.curvature).toBe(0.1);
  });

  it("merges site overrides into the defaults field by field", () => {
    expect(graphConfig.hover).toEqual({ ...defaultGraphConfig.hover, ...site?.hover });
    expect(graphConfig.layout.forces).toEqual({
      ...defaultGraphConfig.layout.forces,
      ...site?.layout?.forces
    });
    expect(graphConfig.links.curvature).toBe(site?.links?.curvature ?? defaultGraphConfig.links.curvature);
  });
});
