import type { Theme, ThemeAppearance, ThemeColors, ThemeInput } from "../../config/types";
import { CONTRAST_TARGETS, PAIR_TARGETS, RAISED_TARGETS } from "./checkTheme";
import { contrastRatio, isCheckable, mixSrgb } from "./contrast";

/**
 * Build a complete `Theme` from as little as three colours.
 *
 * Anything the author leaves out is derived. Neutrals — surfaces, secondary
 * text, borders — are mixed from `bg` and `fg`, so they always sit in the
 * theme's own colour space. Hued semantics (danger, warning, …) cannot be
 * derived from a background, so they fall back to the accessible defaults
 * below; a theme that wants its own reds and golds should say so explicitly.
 *
 * `surface-raised`, behind menus and sheets, is `bg` in a light theme. A dark
 * theme lifts it up to 9% toward `fg`, but only as far as its text colours
 * stay readable on it.
 *
 * The `link` and `annotation` roles fall back to the accent, and so do their
 * `-line` / `-soft` companions: a theme that sets neither role emits exactly
 * the accent's values. Setting a role derives its companions from it instead.
 *
 * Mixes are resolved to hex here whenever both inputs are opaque literals, so
 * derived tokens are contrast-checked like stated ones. A derived token that
 * would miss its contrast target is pulled back toward the colour that clears
 * it — a grey toward `fg`, a tint toward `bg` — just far enough to pass, so a
 * theme whose three colours are readable never fails on a token it did not
 * set. Most themes clear the targets at the usual mix and are not moved. Only a mix of
 * something this module cannot read — a translucent colour, a `var()` — is
 * left as `color-mix()` for the browser, and the checker reports that token
 * as "verify by eye".
 */
export function defineTheme(input: ThemeInput): Theme {
  const { colors } = input;
  const { bg, fg, accent } = colors;
  const dark = input.appearance === "dark";
  const hues = FALLBACK_HUES[input.appearance];

  /** `base` shifted `amount`% of the way toward `toward`. */
  const mix = (base: string, toward: string, amount: number) =>
    mixSrgb(base, toward, amount) ?? `color-mix(in srgb, ${base} ${100 - amount}%, ${toward})`;

  /**
   * `mix`, but stepping `amount` down until `legible` accepts the result. Gives
   * up and returns the plain mix if nothing passes — that means an input itself
   * fails, and the checker will name it.
   */
  const fit = (base: string, toward: string, amount: number, legible: (c: string) => boolean) => {
    for (let step = amount; step >= 0; step -= 1) {
      const candidate = mixSrgb(base, toward, step);
      if (candidate === null) break;
      if (legible(candidate)) return candidate;
    }
    return mix(base, toward, amount);
  };

  /**
   * How far a dark theme's floating surfaces may rise toward `fg`. The actual
   * lift is fitted below; derived greys are made to clear their targets on the
   * full lift, so they never hold it down.
   */
  const RAISED_LIFT = 9;
  const raisedCeiling = dark ? mixSrgb(bg, fg, RAISED_LIFT) : null;

  /**
   * A grey from `fg` toward `bg` that still clears `token`'s target on `bg`
   * and, for text that also sits in menus and sheets, on the raised surface.
   */
  const grey = (token: keyof typeof CONTRAST_TARGETS, amount: number) =>
    fit(fg, bg, amount, (c) => {
      if (contrastRatio(c, bg) < CONTRAST_TARGETS[token]) return false;
      const onRaised = RAISED_TARGETS[token as keyof typeof RAISED_TARGETS];
      return !raisedCeiling || onRaised === undefined || contrastRatio(c, raisedCeiling) >= onRaised;
    });

  /** A tint from `bg` toward `role`'s colour that the colour stays readable on. */
  const tint = (role: (typeof PAIR_TARGETS)[number]["token"], ink: string, amount: number) => {
    const { target } = PAIR_TARGETS.find((pair) => pair.token === role)!;
    return fit(bg, ink, amount, (c) => isCheckable(ink) && contrastRatio(ink, c) >= target);
  };

  const pick = <K extends keyof ThemeColors>(token: K, fallback: string): string =>
    colors[token] ?? fallback;

  const danger = pick("danger", hues.danger);
  const warning = pick("warning", hues.warning);
  const success = pick("success", hues.success);
  const info = pick("info", hues.info);
  const example = pick("example", hues.example);
  const muted = pick("muted", grey("muted", 38));
  const accentSoft = pick("accent-soft", tint("accent", accent, dark ? 14 : 10));
  const accentLine = pick("accent-line", mix(bg, accent, dark ? 30 : 28));
  const link = colors.link;
  const annotation = colors.annotation;

  const resolved: ThemeColors = {
    bg,
    "bg-soft": pick("bg-soft", mix(bg, fg, 3)),
    "bg-soft-2": pick("bg-soft-2", mix(bg, fg, 6)),
    // Placeholder; fitted to the finished text colours below.
    "surface-raised": bg,
    fg,
    "fg-soft": pick("fg-soft", grey("fg-soft", 12)),
    muted,
    "muted-2": pick("muted-2", grey("muted-2", 55)),
    border: pick("border", mix(bg, fg, 12)),
    "border-soft": pick("border-soft", mix(bg, fg, 7)),
    rule: pick("rule", mix(bg, fg, 20)),
    accent,
    "accent-soft": accentSoft,
    "accent-line": accentLine,
    link: link ?? accent,
    "link-line": pick("link-line", link ? mix(bg, link, dark ? 30 : 28) : accentLine),
    annotation: annotation ?? accent,
    "annotation-soft": pick(
      "annotation-soft",
      annotation ? tint("annotation", annotation, dark ? 14 : 10) : accentSoft
    ),
    "annotation-line": pick(
      "annotation-line",
      annotation ? mix(bg, annotation, dark ? 30 : 28) : accentLine
    ),
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
    quote: pick("quote", grey("quote", 45)),
    // The quote rule is a quiet grey; its title reuses the readable one.
    "quote-text": pick("quote-text", muted),
    "graph-hub": pick("graph-hub", fg),
    "graph-sub-hub": pick("graph-sub-hub", grey("graph-sub-hub", 45)),
    "graph-paper": pick("graph-paper", accent),
    "graph-post": pick("graph-post", info),
    "graph-note": pick("graph-note", grey("graph-note", 55)),
    "graph-teaching": pick("graph-teaching", success),
    "graph-project": pick("graph-project", example),
    "graph-edge": pick("graph-edge", mix(bg, fg, 28)),
    "placeholder-a": pick("placeholder-a", mix(bg, fg, 6)),
    "placeholder-b": pick("placeholder-b", mix(bg, fg, 10))
  };

  resolved["surface-raised"] = pick(
    "surface-raised",
    dark
      ? fit(bg, fg, RAISED_LIFT, (c) =>
          Object.entries(RAISED_TARGETS).every(([token, target]) => {
            const value = resolved[token as keyof ThemeColors];
            return isCheckable(value) && contrastRatio(value, c) >= target;
          })
        )
      : bg
  );

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
