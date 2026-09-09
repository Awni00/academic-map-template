import type { ThemeInput } from "../config/types";

/**
 * Site-owned themes.
 *
 * The template ships ten themes (`src/config/defaults/themes.ts`); pick two of
 * them with `theme: { light, dark }` in `src/site/config.ts`. Define a theme
 * here only when you want colours the built-ins do not offer. Giving a theme
 * here the same `id` as a built-in replaces it, which is the supported way to
 * retune a shipped theme without editing template files.
 *
 * Only `bg`, `fg` and `accent` are required. Everything omitted is derived
 * from those three — surfaces and borders are mixed from `bg` toward `fg`, and
 * the hued semantics fall back to accessible defaults for the appearance you
 * declare. Fill in more as you want more control.
 *
 * `npm run validate` checks every theme defined here for contrast, so a colour
 * that would be unreadable fails the build with the measured ratio rather than
 * shipping. Derived `color-mix()` values cannot be measured and are reported
 * as "verify by eye".
 *
 * The dev server reads this at startup — restart it after editing.
 */
export const customThemes: readonly ThemeInput[] = [
  // {
  //   id: "seminar",
  //   label: "Seminar",
  //   appearance: "light",
  //   shiki: "min-light",
  //   colors: {
  //     bg: "#fffdf8",
  //     fg: "#1b1a17",
  //     accent: "#8a3324",
  //     // Optional — anything you leave out is derived from the three above.
  //     muted: "#6a655c",
  //     "graph-teaching": "#3f6b46"
  //   }
  // }
];
