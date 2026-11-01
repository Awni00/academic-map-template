import type { Theme, ThemeColors } from "../../config/types";
import { contrastRatio, isCheckable, isDarkBackground, isOpaque, parseColor } from "./contrast";

export type ThemeIssue = { theme: string; token: string; message: string };
export type ThemeReport = { errors: ThemeIssue[]; warnings: ThemeIssue[] };

/**
 * Minimum contrast each token must reach against the theme's `bg`.
 *
 * The targets differ because the tokens do different jobs. Anything that
 * renders as small text is held to WCAG AA (4.5:1) or better; anything that
 * only ever renders as a shape — a callout's left rule, an icon, a graph node
 * — is held to the 3:1 that AA asks of non-text elements. Body copy aims at
 * AAA (7:1) because this template sets it in a 17px serif.
 */
export const CONTRAST_TARGETS = {
  fg: 7,
  "fg-soft": 5.5,
  muted: 4.5,
  "muted-2": 3,
  accent: 4.5,
  link: 4.5,
  annotation: 4.5,
  "danger-text": 4.5,
  "warning-text": 4.5,
  "success-text": 4.5,
  "info-text": 4.5,
  "example-text": 4.5,
  "quote-text": 4.5,
  danger: 3,
  warning: 3,
  success: 3,
  info: 3,
  example: 3,
  quote: 3,
  "graph-hub": 3,
  "graph-sub-hub": 3,
  "graph-paper": 3,
  "graph-post": 3,
  "graph-note": 3,
  "graph-teaching": 3,
  "graph-project": 3
} as const satisfies Partial<Record<keyof ThemeColors, number>>;

/**
 * Text that also appears on `surface-raised` — the menu, the contents and
 * filter sheets, the map's inspector — and must stay readable there. These are
 * interface labels rather than long-form prose, so even `fg` is held to AA.
 */
export const RAISED_TARGETS = {
  fg: 4.5,
  "fg-soft": 4.5,
  muted: 4.5,
  "muted-2": 3,
  accent: 4.5
} as const satisfies Partial<Record<keyof ThemeColors, number>>;

/**
 * Text drawn on a tinted background rather than on `bg`, measured against
 * that tint: the accent on its own soft fill (publication pills) and an
 * annotation on its open-state highlight (an open `<Term>` or note mark).
 */
export const PAIR_TARGETS = [
  { token: "accent", on: "accent-soft", target: 4.5 },
  { token: "annotation", on: "annotation-soft", target: 4.5 }
] as const satisfies readonly {
  token: keyof ThemeColors;
  on: keyof ThemeColors;
  target: number;
}[];

/**
 * Separators are meant to be quiet, so they get an advisory floor rather than
 * a hard one — a border that vanishes entirely is usually a mistake, but a
 * faint one can be a deliberate choice.
 */
const BORDER_ADVISORY = {
  border: 1.2,
  rule: 1.2
} as const satisfies Partial<Record<keyof ThemeColors, number>>;

const REQUIRED_TOKENS: readonly (keyof ThemeColors)[] = [
  "bg",
  "bg-soft",
  "bg-soft-2",
  "surface-raised",
  "fg",
  "fg-soft",
  "muted",
  "muted-2",
  "border",
  "border-soft",
  "rule",
  "accent",
  "accent-soft",
  "accent-line",
  "link",
  "link-line",
  "annotation",
  "annotation-soft",
  "annotation-line",
  "danger",
  "danger-text",
  "warning",
  "warning-text",
  "success",
  "success-text",
  "info",
  "info-text",
  "example",
  "example-text",
  "quote",
  "quote-text",
  "graph-hub",
  "graph-sub-hub",
  "graph-paper",
  "graph-post",
  "graph-note",
  "graph-teaching",
  "graph-project",
  "graph-edge",
  "placeholder-a",
  "placeholder-b"
];

/**
 * Check one theme's structure and readability.
 *
 * Tokens whose value is a `color-mix()` or `var()` expression cannot be
 * measured here — only a browser can resolve them — so they are reported as a
 * warning rather than silently passing.
 */
export function checkTheme(theme: Theme): ThemeReport {
  const errors: ThemeIssue[] = [];
  const warnings: ThemeIssue[] = [];
  const at = (token: string, message: string) => ({
    theme: theme.id,
    token,
    message
  });

  for (const token of REQUIRED_TOKENS) {
    const value = theme.colors[token];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(at(token, "missing"));
    }
  }
  if (errors.length > 0) return { errors, warnings };

  const background = theme.colors.bg;
  if (!isCheckable(background)) {
    errors.push(at("bg", `background "${background}" must be a literal colour, not a derived one`));
    return { errors, warnings };
  }
  // Every other token is measured against `bg`, and a translucent page
  // background shows the browser canvas through it, which we cannot know.
  if (!isOpaque(background)) {
    errors.push(at("bg", `background "${background}" must be fully opaque`));
    return { errors, warnings };
  }

  if (isDarkBackground(background) !== (theme.appearance === "dark")) {
    errors.push(
      at(
        "appearance",
        `declared "${theme.appearance}" but background ${background} reads as ` +
          `${isDarkBackground(background) ? "dark" : "light"}`
      )
    );
  }

  for (const [token, target] of Object.entries(CONTRAST_TARGETS)) {
    const value = theme.colors[token as keyof ThemeColors];
    if (!isCheckable(value)) {
      warnings.push(at(token, `"${value}" cannot be contrast-checked; verify it by eye`));
      continue;
    }
    const ratio = contrastRatio(value, background);
    if (ratio < target) {
      errors.push(
        at(
          token,
          `${value} on ${background} is ${ratio.toFixed(2)}:1, below the ${target}:1 required`
        )
      );
    }
  }

  const raised = theme.colors["surface-raised"];
  if (isCheckable(raised)) {
    const surface = flatten(raised, background);
    for (const [token, target] of Object.entries(RAISED_TARGETS)) {
      const value = theme.colors[token as keyof ThemeColors];
      if (!isCheckable(value)) continue;
      const ratio = contrastRatio(value, surface);
      if (ratio < target) {
        errors.push(
          at(
            token,
            `${value} on surface-raised ${raised} is ${ratio.toFixed(2)}:1, below the ${target}:1 required`
          )
        );
      }
    }
  } else {
    warnings.push(at("surface-raised", `"${raised}" cannot be contrast-checked; verify it by eye`));
  }

  for (const { token, on, target } of PAIR_TARGETS) {
    const value = theme.colors[token];
    const tint = theme.colors[on];
    if (!isCheckable(value) || !isCheckable(tint)) continue;
    const surface = flatten(tint, background);
    const ratio = contrastRatio(value, surface);
    if (ratio < target) {
      errors.push(
        at(
          token,
          `${value} on ${on} ${tint} is ${ratio.toFixed(2)}:1, below the ${target}:1 required`
        )
      );
    }
  }

  for (const [token, target] of Object.entries(BORDER_ADVISORY)) {
    const value = theme.colors[token as keyof ThemeColors];
    if (!isCheckable(value)) continue;
    const ratio = contrastRatio(value, background);
    if (ratio < target) {
      warnings.push(
        at(token, `${value} on ${background} is ${ratio.toFixed(2)}:1 and may be invisible`)
      );
    }
  }

  return { errors, warnings };
}

/** A possibly translucent tint as it renders over the opaque `background`, as hex. */
function flatten(tint: string, background: string): string {
  const top = parseColor(tint)!;
  const back = parseColor(background)!;
  const channel = (a: number, b: number) =>
    Math.round(a * top.alpha + b * (1 - top.alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(top.r, back.r)}${channel(top.g, back.g)}${channel(top.b, back.b)}`;
}

/** Run `checkTheme` across a registry, flattening the reports. */
export function checkThemes(themes: readonly Theme[]): ThemeReport {
  const errors: ThemeIssue[] = [];
  const warnings: ThemeIssue[] = [];
  for (const theme of themes) {
    const report = checkTheme(theme);
    errors.push(...report.errors);
    warnings.push(...report.warnings);
  }
  return { errors, warnings };
}
