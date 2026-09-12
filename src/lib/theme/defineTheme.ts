import type { Theme, ThemeAppearance, ThemeColors, ThemeInput } from "../../config/types";

/**
 * Build a complete `Theme` from as little as three colours.
 *
 * Anything the author leaves out is derived. Neutrals — surfaces, secondary
 * text, borders — are mixed from `bg` and `fg`, so they always sit in the
 * theme's own colour space. Hued semantics (danger, warning, …) cannot be
 * derived from a background, so they fall back to the accessible defaults
 * below; a theme that wants its own reds and golds should say so explicitly.
 *
 * Derived values are emitted as `color-mix()` rather than being resolved to
 * hex here. That keeps this function free of a colour-space implementation,
 * but it means the contrast checker cannot measure them — it reports those
 * tokens as "verify by eye" instead of passing them silently.
 */
export function defineTheme(input: ThemeInput): Theme {
  const { colors } = input;
  const { bg, fg, accent } = colors;
  const dark = input.appearance === "dark";
  const hues = FALLBACK_HUES[input.appearance];

  /** `base` shifted `amount`% of the way toward `toward`. */
  const mix = (base: string, toward: string, amount: number) =>
    `color-mix(in srgb, ${base} ${100 - amount}%, ${toward})`;

  const pick = <K extends keyof ThemeColors>(token: K, fallback: string): string =>
    colors[token] ?? fallback;

  const danger = pick("danger", hues.danger);
  const warning = pick("warning", hues.warning);
  const success = pick("success", hues.success);
  const info = pick("info", hues.info);
  const example = pick("example", hues.example);
  const muted = pick("muted", mix(fg, bg, 38));

  const resolved: ThemeColors = {
    bg,
    "bg-soft": pick("bg-soft", mix(bg, fg, 3)),
    "bg-soft-2": pick("bg-soft-2", mix(bg, fg, 6)),
    fg,
    "fg-soft": pick("fg-soft", mix(fg, bg, 12)),
    muted,
    "muted-2": pick("muted-2", mix(fg, bg, 55)),
    border: pick("border", mix(bg, fg, 12)),
    "border-soft": pick("border-soft", mix(bg, fg, 7)),
    rule: pick("rule", mix(bg, fg, 20)),
    accent,
    "accent-soft": pick("accent-soft", mix(bg, accent, dark ? 14 : 10)),
    "accent-line": pick("accent-line", mix(bg, accent, dark ? 30 : 28)),
    danger,
    "danger-text": pick("danger-text", danger),
    warning,
    "warning-text": pick("warning-text", warning),
    success,
    "success-text": pick("success-text", success),
    info,
    "info-text": pick("info-text", info),
    example,
    "example-text": pick("example-text", example),
    quote: pick("quote", mix(fg, bg, 45)),
    // The quote rule is a quiet grey; its title reuses the readable one.
    "quote-text": pick("quote-text", muted),
    "graph-hub": pick("graph-hub", fg),
    "graph-sub-hub": pick("graph-sub-hub", mix(fg, bg, 45)),
    "graph-paper": pick("graph-paper", accent),
    "graph-post": pick("graph-post", info),
    "graph-note": pick("graph-note", mix(fg, bg, 55)),
    "graph-teaching": pick("graph-teaching", success),
    "graph-project": pick("graph-project", example),
    "graph-edge": pick("graph-edge", mix(bg, fg, 28)),
    "placeholder-a": pick("placeholder-a", mix(bg, fg, 6)),
    "placeholder-b": pick("placeholder-b", mix(bg, fg, 10))
  };

  return {
    id: input.id,
    label: input.label,
    appearance: input.appearance,
    shiki: input.shiki ?? (dark ? "github-dark-default" : "github-light-default"),
    colors: resolved,
    shadows: { ...DEFAULT_SHADOWS[input.appearance], ...input.shadows }
  };
}

/**
 * Hues used when a theme does not name its own. Chosen to clear 4.5:1 as text
 * on a typical background of the matching appearance, so a three-colour custom
 * theme still passes `npm run validate`.
 */
const FALLBACK_HUES: Record<
  ThemeAppearance,
  {
    danger: string;
    warning: string;
    success: string;
    info: string;
    example: string;
  }
> = {
  light: {
    danger: "#b91c1c",
    warning: "#a2620a",
    success: "#15803d",
    info: "#1f6feb",
    example: "#7c3aed"
  },
  dark: {
    danger: "#f8757f",
    warning: "#e2b341",
    success: "#4ade80",
    info: "#7aa2f7",
    example: "#c4a7e7"
  }
};

const DEFAULT_SHADOWS: Record<ThemeAppearance, Theme["shadows"]> = {
  light: {
    sm: "0 1px 2px rgb(0 0 0 / 0.05)",
    md: "0 6px 24px rgb(0 0 0 / 0.06)",
    soft: "0 20px 60px rgb(0 0 0 / 0.08)"
  },
  dark: {
    sm: "0 1px 2px rgb(0 0 0 / 0.4)",
    md: "0 6px 24px rgb(0 0 0 / 0.4)",
    soft: "0 20px 60px rgb(0 0 0 / 0.5)"
  }
};
