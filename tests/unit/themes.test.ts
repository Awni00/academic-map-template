import { describe, expect, it } from "vitest";

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
    // Order must not matter.
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#777777"),
      10
    );
  });

  it("parses the colour syntaxes a theme may use", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#1E66F5")).toEqual({ r: 30, g: 102, b: 245 });
    expect(parseColor("rgb(8, 109, 221)")).toEqual({ r: 8, g: 109, b: 221 });
    expect(parseColor("rgb(8 109 221 / 0.5)")).toEqual({
      r: 8,
      g: 109,
      b: 221
    });
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
