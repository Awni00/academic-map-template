import { describe, expect, it } from "vitest";

import { CALLOUT_ROLE_COLORS } from "../../src/components/article/calloutRoles";
import { builtInThemes } from "../../src/config/defaults/themes";
import { darkTheme, lightTheme, themeConfig, themeRegistry } from "../../src/config/resolve";
import { CONTRAST_TARGETS, PAIR_TARGETS, RAISED_TARGETS, checkTheme } from "../../src/lib/theme/checkTheme";
import { contrastRatio, isCheckable, mixSrgb, parseColor } from "../../src/lib/theme/contrast";
import { defineTheme } from "../../src/lib/theme/defineTheme";
import {
  FALLBACK_SERIES,
  FIGURE_COLOR_TOKENS,
  FIGURE_MIX,
  FIGURE_SERIES_TOKENS,
  FIGURE_TARGETS,
  checkFigureColors,
  deriveFigureAlt,
  strongFill
} from "../../src/lib/theme/figureColors";
import { deltaE, deltaECvd } from "../../src/lib/theme/perception";
import { siteThemeCss, themeToCss } from "../../src/lib/theme/themeCss";
import type { Theme } from "../../src/config/types";

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

  it("mixes opaque colours in sRGB, as color-mix(in srgb) paints them", () => {
    // `amount` is the share of `toward`: 25% of the way from white to black.
    expect(mixSrgb("#ffffff", "#000000", 25)).toBe("#bfbfbf");
    expect(mixSrgb("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixSrgb("#ff0000", "#0000ff", 100)).toBe("#0000ff");
    expect(mixSrgb("rgb(0 0 0)", "#fff", 50)).toBe("#808080");
  });

  it("leaves mixes it cannot resolve faithfully to the browser", () => {
    expect(mixSrgb("var(--x)", "#fff", 50)).toBeNull();
    expect(mixSrgb("rgba(0, 0, 0, 0.5)", "#fff", 50)).toBeNull();
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
  it("ships eighteen themes with unique ids", () => {
    expect(builtInThemes).toHaveLength(18);
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

  // The Paper/Ink variants each split one role off their accent; every other
  // built-in leaves both roles on it.
  const VARIANTS = {
    ember: { split: "link" },
    claret: { split: "link" },
    pine: { split: "link" },
    indigo: { split: "annotation" }
  } as const;
  const variantOf = (id: string) => VARIANTS[id.replace(/-(light|dark)$/, "") as keyof typeof VARIANTS];

  it("leaves the optional roles on the accent unless a theme sets one", () => {
    for (const theme of builtInThemes.filter((candidate) => !variantOf(candidate.id))) {
      const c = theme.colors;
      expect(c.link, theme.id).toBe(c.accent);
      expect(c.annotation, theme.id).toBe(c.accent);
      expect(c["link-line"], theme.id).toBe(c["accent-line"]);
      expect(c["annotation-soft"], theme.id).toBe(c["accent-soft"]);
      expect(c["annotation-line"], theme.id).toBe(c["accent-line"]);
    }
  });

  it.each(Object.keys(VARIANTS).flatMap((name) => [`${name}-light`, `${name}-dark`]))(
    "builds %s on Paper/Ink's page with its own accent and one split-off role",
    (id) => {
      const { split } = variantOf(id);
      const kept = split === "link" ? "annotation" : "link";
      const v = builtInThemes.find((theme) => theme.id === id)!;
      const b = builtInThemes.find((theme) => theme.id === (v.appearance === "light" ? "paper" : "ink"))!.colors;
      const c = v.colors;
      for (const token of ["bg", "fg", "fg-soft", "muted", "muted-2", "border", "rule"] as const) {
        expect(c[token], `${id}.${token}`).toBe(b[token]);
      }
      expect(c.accent).not.toBe(b.accent);
      expect(c["graph-paper"]).toBe(c.accent);
      expect(c[split]).not.toBe(c.accent);
      expect(c[kept]).toBe(c.accent);
    }
  );

  it("keeps text on its own tint readable", () => {
    for (const theme of builtInThemes) {
      for (const { token, on, target } of PAIR_TARGETS) {
        const ratio = contrastRatio(theme.colors[token], theme.colors[on]);
        expect(ratio, `${theme.id}: ${token} on ${on}`).toBeGreaterThanOrEqual(target);
      }
    }
  });

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

  it("holds the link and annotation roles to the text threshold", () => {
    const report = checkTheme({
      ...base,
      colors: { ...base.colors, link: "#a0b4e0", annotation: "#e0b0a0" }
    });
    const tokens = report.errors.map((issue) => issue.token);
    expect(tokens).toContain("link");
    expect(tokens).toContain("annotation");
  });

  it("measures an annotation against its open-state tint, not just the page", () => {
    // 6.1:1 on white, but the tint is dark enough to drop it below 4.5:1.
    const report = checkTheme({
      ...base,
      colors: { ...base.colors, annotation: "#2c5cc5", "annotation-soft": "#c8d6f3" }
    });
    expect(report.errors).toEqual([
      expect.objectContaining({
        token: "annotation",
        message: expect.stringMatching(/on annotation-soft/)
      })
    ]);
  });

  it("measures a translucent tint as it renders over the page", () => {
    const opaque = checkTheme({
      ...base,
      colors: { ...base.colors, "accent-soft": "#2c5cc5" }
    });
    const faint = checkTheme({
      ...base,
      colors: { ...base.colors, "accent-soft": "rgba(44, 92, 197, 0.05)" }
    });
    expect(opaque.errors.map((issue) => issue.token)).toContain("accent");
    expect(faint.errors).toEqual([]);
  });

  it("checks text against an explicit raised surface", () => {
    const ink = builtInThemes.find((candidate) => candidate.id === "ink")!;
    const report = checkTheme({ ...ink, colors: { ...ink.colors, "surface-raised": "#55565c" } });
    expect(report.errors).toContainEqual(
      expect.objectContaining({ token: "muted", message: expect.stringMatching(/on surface-raised/) })
    );
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
  });

  it("resolves derived mixes to literals, so every checked token is measured", () => {
    expect(minimal.colors["bg-soft"]).toBe(mixSrgb("#ffffff", "#101010", 3));
    expect(minimal.colors.muted).toBe(mixSrgb("#101010", "#ffffff", 38));
    for (const token of Object.keys(CONTRAST_TARGETS)) {
      const value = minimal.colors[token as keyof typeof minimal.colors];
      expect(isCheckable(value), `${token} = ${value}`).toBe(true);
    }
    expect(checkTheme(minimal).warnings).toEqual([]);
  });

  // Before derived tokens were measured, this pair shipped muted-2 and
  // graph-note at 2.88:1 under a "verify by eye" warning.
  it("pulls a derived grey back toward fg only as far as its target needs", () => {
    const cream = defineTheme({
      id: "cream",
      label: "Cream",
      appearance: "light",
      colors: { bg: "#fffdf8", fg: "#1b1a17", accent: "#8a3324" }
    });
    expect(contrastRatio(cream.colors["muted-2"], "#fffdf8")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(cream.colors["muted-2"], "#fffdf8")).toBeLessThan(3.1);
    // Unmoved where the usual mix already clears its target.
    expect(cream.colors.muted).toBe(mixSrgb("#1b1a17", "#fffdf8", 38));
    expect(checkTheme(cream).errors).toEqual([]);
  });

  it.each([
    ["light, fg at exactly 7:1", "light", "#ffffff", "#595959", "#1a5fb4"],
    ["dark, fg at 7:1", "dark", "#0c0d10", "#9c9c9c", "#8ab4f8"],
    ["light, accent just past 4.5:1", "light", "#ffffff", "#101010", "#2f78b0"],
    ["dark, accent just past 4.5:1", "dark", "#202020", "#f0f0f0", "#4a8af0"]
  ] as const)("keeps a readable three-colour theme valid: %s", (_name, appearance, bg, fg, accent) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(accent, bg)).toBeGreaterThanOrEqual(4.5);
    const theme = defineTheme({ id: "edge", label: "Edge", appearance, colors: { bg, fg, accent } });
    expect(checkTheme(theme).errors).toEqual([]);
  });

  it("does not bend a tint to rescue a role that fails on its own", () => {
    const failing = defineTheme({
      id: "failing",
      label: "Failing",
      appearance: "light",
      colors: { bg: "#ffffff", fg: "#101010", accent: "#0b57d0", annotation: "#9db8e8" }
    });
    expect(failing.colors["annotation-soft"]).toBe(mixSrgb("#ffffff", "#9db8e8", 10));
    expect(checkTheme(failing).errors.map((issue) => issue.token)).toContain("annotation");
  });

  it("keeps a light theme's raised surface on bg", () => {
    expect(minimal.colors["surface-raised"]).toBe("#ffffff");
  });

  it("lifts a dark theme's raised surface 9% when its text allows", () => {
    const night = defineTheme({
      id: "night",
      label: "Night",
      appearance: "dark",
      colors: { bg: "#16171b", fg: "#ece8df", accent: "#e0a46a" }
    });
    expect(night.colors["surface-raised"]).toBe(mixSrgb("#16171b", "#ece8df", 9));
  });

  // rose-pine's stated muted (#908caa) is 4.42:1 on the full 9% lift.
  it("lifts less when a stated colour would fail on the full lift", () => {
    const rosePine = builtInThemes.find((theme) => theme.id === "rose-pine")!;
    const { bg, fg, muted } = rosePine.colors;
    expect(contrastRatio(muted, mixSrgb(bg, fg, 9)!)).toBeLessThan(4.5);
    expect(rosePine.colors["surface-raised"]).not.toBe(bg);
    expect(contrastRatio(muted, rosePine.colors["surface-raised"])).toBeGreaterThanOrEqual(4.5);
  });

  it("derives greys that read on menus and sheets as well as the page", () => {
    const edge = defineTheme({
      id: "edge",
      label: "Edge",
      appearance: "dark",
      colors: { bg: "#0c0d10", fg: "#9c9c9c", accent: "#8ab4f8" }
    });
    const raised = edge.colors["surface-raised"];
    for (const [token, target] of Object.entries(RAISED_TARGETS)) {
      const value = edge.colors[token as keyof typeof edge.colors];
      expect(contrastRatio(value, raised), token).toBeGreaterThanOrEqual(target);
    }
  });

  it("falls back to color-mix() when an input is not a literal", () => {
    const themed = defineTheme({
      id: "vars",
      label: "Vars",
      appearance: "light",
      colors: { bg: "#ffffff", fg: "var(--ink)", accent: "#0b57d0" }
    });
    expect(themed.colors.muted).toBe("color-mix(in srgb, var(--ink) 62%, #ffffff)");
  });

  it("gives unset roles the accent and its companions", () => {
    const c = minimal.colors;
    expect(c.link).toBe("#0b57d0");
    expect(c.annotation).toBe("#0b57d0");
    expect(c["link-line"]).toBe(c["accent-line"]);
    expect(c["annotation-soft"]).toBe(c["accent-soft"]);
    expect(c["annotation-line"]).toBe(c["accent-line"]);
  });

  it("derives a set role's companions from the role, not the accent", () => {
    const roles = defineTheme({
      id: "roles",
      label: "Roles",
      appearance: "dark",
      colors: { bg: "#16171b", fg: "#ece8df", accent: "#e0a46a", link: "#8cc4e8", annotation: "#c4a7e7" }
    });
    const c = roles.colors;
    expect(c.link).toBe("#8cc4e8");
    expect(c["link-line"]).toBe(mixSrgb("#16171b", "#8cc4e8", 30));
    expect(c["annotation-soft"]).toBe(mixSrgb("#16171b", "#c4a7e7", 14));
    expect(c["annotation-line"]).toBe(mixSrgb("#16171b", "#c4a7e7", 30));
    // The accent keeps its own companions.
    expect(c["accent-line"]).toBe(mixSrgb("#16171b", "#e0a46a", 30));
    expect(checkTheme(roles).errors).toEqual([]);
  });

  it("keeps an explicit companion over the derived one", () => {
    const roles = defineTheme({
      id: "explicit",
      label: "Explicit",
      appearance: "light",
      colors: { bg: "#ffffff", fg: "#101010", accent: "#0b57d0", link: "#1f5f8b", "link-line": "#1f5f8b" }
    });
    expect(roles.colors["link-line"]).toBe("#1f5f8b");
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

describe("figure colours", () => {
  const paper = builtInThemes.find((theme) => theme.id === "paper")!;
  const figureErrors = (theme: Theme) =>
    checkTheme(theme).errors.filter((issue) => issue.token.startsWith("figure-"));

  it("gives every built-in theme a palette that clears every figure check", () => {
    for (const theme of builtInThemes) {
      const issues = checkFigureColors(theme);
      expect(issues, theme.id).toEqual([]);
      for (const token of FIGURE_COLOR_TOKENS) {
        expect(contrastRatio(theme.colors[token], theme.colors.bg), `${theme.id} ${token}`).toBeGreaterThanOrEqual(
          FIGURE_TARGETS.contrast
        );
      }
      for (let i = 0; i + 1 < FIGURE_SERIES_TOKENS.length; i += 1) {
        const [a, b] = [theme.colors[FIGURE_SERIES_TOKENS[i]], theme.colors[FIGURE_SERIES_TOKENS[i + 1]]];
        expect(deltaECvd(a, b), `${theme.id} slots ${i + 1}–${i + 2}`).toBeGreaterThanOrEqual(FIGURE_TARGETS.cvdTarget);
      }
      for (const token of [...FIGURE_SERIES_TOKENS, "figure-neutral"] as const) {
        const fill = strongFill(theme.colors[token], theme.appearance)!;
        expect(contrastRatio("#ffffff", fill), `${theme.id} ${token} strong`).toBeGreaterThanOrEqual(
          FIGURE_TARGETS.strongText
        );
      }
    }
  });

  it("derives a three-colour theme's palette, and it passes", () => {
    for (const appearance of ["light", "dark"] as const) {
      const theme = defineTheme({
        id: `three-${appearance}`,
        label: "Three",
        appearance,
        colors:
          appearance === "light"
            ? { bg: "#fffdf8", fg: "#1b1a17", accent: "#8a3324" }
            : { bg: "#1e2030", fg: "#e0e0e0", accent: "#8aadf4" }
      });
      expect(checkTheme(theme).errors).toEqual([]);
      expect(theme.colors["figure-1"]).toBeTruthy();
      expect(theme.colors["figure-6-alt"]).toMatch(/^#/);
    }
  });

  it("keeps stated slots and derives only what is left out", () => {
    const theme = defineTheme({
      id: "stated",
      label: "Stated",
      appearance: "light",
      colors: { bg: "#ffffff", fg: "#111111", accent: "#8a3324", "figure-1": "#8a3324", "figure-1-alt": "#c08070" }
    });
    expect(theme.colors["figure-1"]).toBe("#8a3324");
    expect(theme.colors["figure-1-alt"]).toBe("#c08070");
    expect(theme.colors["figure-2"]).toBe(FALLBACK_SERIES.light[1]);
  });

  // The override documented in docs/theming.md: spread a built-in in
  // src/site/themes.ts and change only its chart colours.
  it("lets a site retune a built-in's chart colours by spreading it", () => {
    const retuned = defineTheme({ ...paper, colors: { ...paper.colors, "figure-1": "#8b1e3f" } });
    expect(retuned.colors["figure-1"]).toBe("#8b1e3f");
    expect(retuned.colors["figure-2"]).toBe(paper.colors["figure-2"]);
    expect(retuned.colors.accent).toBe(paper.colors.accent);
    expect(checkTheme(retuned).errors).toEqual([]);
  });

  it("pales a strong slot for its companion and deepens a weak one", () => {
    const strong = deriveFigureAlt("#2c5cc5", "#ffffff", "#15161a");
    const weak = deriveFigureAlt("#9d6d03", "#ffffff", "#15161a");
    expect(contrastRatio(strong, "#ffffff")).toBeLessThan(contrastRatio("#2c5cc5", "#ffffff"));
    expect(contrastRatio(strong, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(weak, "#ffffff")).toBeGreaterThan(contrastRatio("#9d6d03", "#ffffff"));
    expect(deltaE(weak, "#9d6d03")).toBeGreaterThanOrEqual(FIGURE_TARGETS.alt);
  });

  it("fails a slot that vanishes on the page", () => {
    const theme = { ...paper, colors: { ...paper.colors, "figure-3": "#e0e0e0" } };
    expect(figureErrors(theme).map((issue) => issue.token)).toContain("figure-3");
  });

  it("fails neighbours that red–green colour-blind readers cannot tell apart", () => {
    // A red and a green of the same lightness: distinct to most readers,
    // nearly identical under protanopia.
    const theme = { ...paper, colors: { ...paper.colors, "figure-1": "#c0392b", "figure-2": "#5a8a00" } };
    expect(deltaECvd("#c0392b", "#5a8a00")).toBeLessThan(FIGURE_TARGETS.cvdFloor);
    expect(figureErrors(theme).some((issue) => issue.message.includes("colour-blind"))).toBe(true);
  });

  it("fails a tone too light to carry white text on its strong fill", () => {
    const theme = { ...paper, colors: { ...paper.colors, "figure-2": "#d9a400" } };
    expect(figureErrors(theme).some((issue) => issue.message.includes("strong fill"))).toBe(true);
  });

  it("emits the palette as --figure-* and the mixes per appearance", () => {
    const css = themeToCss(paper, ":root");
    expect(css).toContain(`--figure-1: ${paper.colors["figure-1"]};`);
    expect(css).toContain("--figure-6-alt:");
    expect(css).toContain("--figure-neutral:");
    expect(css).not.toContain("--color-figure");
    expect(css).toContain(`--figure-strong: ${FIGURE_MIX.light.strong}%;`);
    expect(css).toContain(`--figure-band-opacity: ${FIGURE_MIX.light.band};`);
  });
});
