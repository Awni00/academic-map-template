import { describe, expect, it } from "vitest";

import { CALLOUT_ROLE_COLORS } from "../../src/components/article/calloutRoles";
import { builtInThemes } from "../../src/config/defaults/themes";
import { darkTheme, lightTheme, themeConfig, themeRegistry } from "../../src/config/resolve";
import { CONTRAST_TARGETS, checkTheme } from "../../src/lib/theme/checkTheme";
import { contrastRatio, isCheckable, parseColor } from "../../src/lib/theme/contrast";
import { defineTheme } from "../../src/lib/theme/defineTheme";
import { siteThemeCss, themeToCss } from "../../src/lib/theme/themeCss";

describe("contrast", () => {
  it("measures the WCAG reference pairs", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // For two opaque colours, order must not matter.
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#777777"),
      10
    );
  });

  it("parses the colour syntaxes a theme may use", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, alpha: 1 });
    expect(parseColor("#1E66F5")).toEqual({ r: 30, g: 102, b: 245, alpha: 1 });
    expect(parseColor("rgb(8, 109, 221)")).toEqual({ r: 8, g: 109, b: 221, alpha: 1 });
    expect(parseColor("rgb(8 109 221 / 0.5)")).toEqual({ r: 8, g: 109, b: 221, alpha: 0.5 });
    expect(parseColor("rgba(8, 109, 221, 25%)")).toEqual({ r: 8, g: 109, b: 221, alpha: 0.25 });
    expect(parseColor("#0000")?.alpha).toBe(0);
    expect(parseColor("#00000080")?.alpha).toBeCloseTo(128 / 255, 10);
  });

  // The regression: alpha used to be dropped, so this measured 18.42:1 and
  // passed every threshold while rendering close to invisible.
  it("measures a translucent foreground as it is actually seen", () => {
    const seen = contrastRatio("rgba(20, 20, 20, 0.15)", "#ffffff");
    expect(seen).toBeLessThan(1.5);
    expect(seen).toBeCloseTo(contrastRatio("#dcdcdc", "#ffffff"), 1);
    expect(contrastRatio("rgb(0 0 0 / 0)", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("refuses to measure against a translucent background", () => {
    expect(() => contrastRatio("#000000", "rgba(255, 255, 255, 0.5)")).toThrow(/translucent/);
  });

  it("reports derived and malformed values as unmeasurable rather than throwing", () => {
    expect(parseColor("color-mix(in srgb, #fff 90%, #000)")).toBeNull();
    expect(isCheckable("color-mix(in srgb, #fff 90%, #000)")).toBe(false);
    expect(isCheckable("#zzzzzz")).toBe(false);
    expect(() => contrastRatio("var(--nope)", "#fff")).toThrow();
  });
});

describe("built-in themes", () => {
  it("ships ten themes with unique ids", () => {
    expect(builtInThemes).toHaveLength(10);
    const ids = builtInThemes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares an appearance matching each background", () => {
    for (const theme of builtInThemes) {
      const report = checkTheme(theme);
      const mismatch = report.errors.find((issue) => issue.token === "appearance");
      expect(mismatch, `${theme.id}: ${mismatch?.message}`).toBeUndefined();
    }
  });

  // The point of the whole contrast pass: a palette ported from an editor
  // theme must stay readable as a website. Regressing this silently is exactly
  // what this test exists to stop.
  it.each(builtInThemes.map((theme) => [theme.id, theme] as const))(
    "%s clears every contrast target",
    (_id, theme) => {
      const report = checkTheme(theme);
      expect(report.errors.map((issue) => `${issue.token}: ${issue.message}`)).toEqual([]);
    }
  );

  it("states literal colours for every checked token, so nothing skips the check", () => {
    for (const theme of builtInThemes) {
      for (const token of Object.keys(CONTRAST_TARGETS)) {
        const value = theme.colors[token as keyof typeof theme.colors];
        expect(isCheckable(value), `${theme.id}.${token} = ${value}`).toBe(true);
      }
    }
  });
});

describe("checkTheme", () => {
  const base = builtInThemes.find((candidate) => candidate.id === "paper")!;

  it("fails a translucent token that would render unreadably", () => {
    const report = checkTheme({
      ...base,
      colors: { ...base.colors, muted: "rgba(20, 20, 20, 0.15)" }
    });
    expect(report.errors.map((issue) => issue.token)).toContain("muted");
  });

  it("rejects a translucent background instead of throwing", () => {
    const report = checkTheme({
      ...base,
      colors: { ...base.colors, bg: "rgba(255, 255, 255, 0.5)" }
    });
    expect(report.errors).toEqual([
      expect.objectContaining({ token: "bg", message: expect.stringMatching(/opaque/) })
    ]);
  });
});

describe("callout roles", () => {
  const referenced = (value: string) => value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];

  // Callout.astro once built `var(--color-${role}-text)`, which pointed three
  // callout types at a token no theme defines. Every variable a role names
  // must exist in every theme's emitted CSS.
  it.each(builtInThemes.map((theme) => [theme.id, theme] as const))(
    "%s defines every token a callout role uses",
    (_id, theme) => {
      const css = themeToCss(theme, ":root");
      for (const [role, slots] of Object.entries(CALLOUT_ROLE_COLORS)) {
        for (const value of Object.values(slots)) {
          const name = referenced(value);
          expect(name, `${role}: ${value}`).toBeDefined();
          expect(css, `${role} uses ${name}`).toContain(`${name}:`);
        }
      }
    }
  );

  it("paints every title with a token held to the text threshold", () => {
    for (const [role, { text }] of Object.entries(CALLOUT_ROLE_COLORS)) {
      const token = referenced(text)!.replace(/^--color-/, "");
      expect(
        CONTRAST_TARGETS[token as keyof typeof CONTRAST_TARGETS],
        `${role} title uses ${token}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("defineTheme", () => {
  const minimal = defineTheme({
    id: "minimal",
    label: "Minimal",
    appearance: "light",
    colors: { bg: "#ffffff", fg: "#101010", accent: "#0b57d0" }
  });

  it("fills every token from three colours", () => {
    expect(Object.values(minimal.colors).every((value) => typeof value === "string")).toBe(true);
    expect(minimal.colors["bg-soft"]).toContain("color-mix");
    expect(minimal.colors.muted).toContain("color-mix");
  });

  it("derives hued semantics from accessible fallbacks, not from the background", () => {
    expect(isCheckable(minimal.colors.danger)).toBe(true);
    expect(isCheckable(minimal.colors.success)).toBe(true);
    // A three-colour theme must still pass validation.
    expect(checkTheme(minimal).errors).toEqual([]);
  });

  it("gives the quote title the theme's readable grey", () => {
    expect(minimal.colors["quote-text"]).toBe(minimal.colors.muted);
  });

  it("keeps explicit values and picks the appearance's shadow stack", () => {
    const custom = defineTheme({
      id: "custom",
      label: "Custom",
      appearance: "dark",
      colors: {
        bg: "#101014",
        fg: "#eeeeee",
        accent: "#8ab4f8",
        muted: "#a0a0a8"
      }
    });
    expect(custom.colors.muted).toBe("#a0a0a8");
    expect(custom.shadows.sm).toContain("0.4");
    expect(custom.shiki).toBe("github-dark-default");
  });
});

describe("themeToCss", () => {
  const theme = builtInThemes.find((candidate) => candidate.id === "paper")!;

  it("emits prefixed tokens under the given selector", () => {
    const css = themeToCss(theme, '[data-theme="light"]');
    expect(css.startsWith('[data-theme="light"] {')).toBe(true);
    expect(css).toContain("--color-bg: #ffffff;");
    expect(css).toContain("--color-fg: #15161a;");
    // Graph and placeholder tokens keep their own prefixes.
    expect(css).toContain("--graph-hub:");
    expect(css).toContain("--placeholder-a:");
    expect(css).not.toContain("--color-graph-hub:");
    expect(css).toContain("--shadow-sm:");
  });

  it("sets color-scheme so native controls follow the site, not the OS", () => {
    expect(themeToCss(theme, ":root")).toContain("color-scheme: light;");
  });

  it("scopes cleanly, which is what lets the gallery show every theme at once", () => {
    const scoped = themeToCss(theme, '[data-theme-preview="paper"]');
    expect(scoped).toContain('[data-theme-preview="paper"] {');
    expect(scoped).not.toContain(":root");
  });

  it("pairs the light theme with :root so a no-JS page still renders", () => {
    const css = siteThemeCss(lightTheme, darkTheme);
    expect(css).toContain(":root,");
    expect(css).toContain('[data-theme="dark"] {');
  });
});

describe("theme registry", () => {
  it("registers every built-in and resolves the configured pair", () => {
    for (const theme of builtInThemes) {
      expect(themeRegistry.get(theme.id)).toBe(theme);
    }
    expect(lightTheme.id).toBe(themeConfig.light);
    expect(darkTheme.id).toBe(themeConfig.dark);
    expect(lightTheme.appearance).toBe("light");
    expect(darkTheme.appearance).toBe("dark");
  });
});
