import type { Theme, ThemeConfig } from "../../config/types";

/**
 * Render one theme as a CSS rule.
 *
 * `selector` is a parameter rather than being derived from the theme id so the
 * same theme can be emitted as the page-wide `[data-theme="dark"]` block and,
 * on the gallery page, as a scoped `[data-theme-preview="…"]` block that lets
 * every theme render side by side in one document.
 *
 * `color-scheme` is set per theme so native UI — form controls, scrollbars,
 * the canvas behind an overscroll — follows the site's theme rather than the
 * operating system's.
 */
export function themeToCss(theme: Theme, selector: string): string {
  const lines: string[] = [`  color-scheme: ${theme.appearance};`];

  for (const [token, value] of Object.entries(theme.colors)) {
    lines.push(`  --${cssTokenName(token)}: ${value};`);
  }

  // Kept as aliases so existing rules referring to them keep working.
  lines.push("  --color-surface: var(--color-bg-soft);");
  lines.push("  --color-surface-strong: var(--color-bg-soft-2);");

  // Surfaces that float over the page (menus, sheets) and the scrim behind
  // them. A dark page cannot be dimmed much further, so there the floating
  // surface is lifted toward the foreground instead, as elevation does in
  // dark UIs; a light page keeps its own background and a lighter scrim.
  const dark = theme.appearance === "dark";
  lines.push(
    `  --color-surface-raised: ${dark ? "color-mix(in srgb, var(--color-bg) 91%, var(--color-fg))" : "var(--color-bg)"};`
  );
  lines.push(`  --color-scrim: ${dark ? "rgb(0 0 0 / 0.6)" : "rgb(0 0 0 / 0.32)"};`);

  for (const [name, value] of Object.entries(theme.shadows)) {
    lines.push(`  --shadow-${name}: ${value};`);
  }

  return `${selector} {\n${lines.join("\n")}\n}`;
}

/**
 * Graph tokens keep the `--graph-` prefix they already have in `entryTypes`
 * config (`color: "var(--graph-hub)"`); everything else becomes `--color-*`.
 * `placeholder-*` predates both and keeps its bare name.
 */
function cssTokenName(token: string): string {
  if (token.startsWith("graph-")) return token;
  if (token.startsWith("placeholder-")) return token;
  return `color-${token}`;
}

/** The two blocks every page needs: light under `:root`, dark under the attribute. */
export function siteThemeCss(light: Theme, dark: Theme): string {
  return [
    themeToCss(light, ':root,\n[data-theme="light"]'),
    themeToCss(dark, '[data-theme="dark"]')
  ].join("\n\n");
}

/**
 * The typography choices from `theme.typography`, as CSS.
 *
 * These are site-wide rather than per theme — a theme is a palette — but they
 * are emitted alongside it because both come from the same config block and
 * both must land before the stylesheets that consume them.
 */
export function typographyCss(typography: ThemeConfig["typography"]): string {
  return [
    ":root {",
    `  --font-body: var(--font-${typography.body});`,
    `  --font-ui: var(--font-${typography.ui});`,
    `  --font-code: var(--font-${typography.code});`,
    "}"
  ].join("\n");
}

/**
 * The site-wide page width from `theme.layout`, as CSS. `tokens.css` derives
 * `--content-wide` from it, so the header, footer, and homepage share one edge.
 */
export function layoutCss(layout: ThemeConfig["layout"]): string {
  return [":root {", `  --page-width: ${layout.contentWidth}px;`, "}"].join("\n");
}
