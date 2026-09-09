import type { ThemeConfig } from "../types";

export const defaultThemeConfig = {
  // Theme ids from `src/config/defaults/themes.ts`, or from `src/site/themes.ts`
  // if the site defines its own.
  light: "paper",
  dark: "ink",
  defaultMode: "system",
  allowToggle: true,
  typography: {
    body: "serif",
    ui: "sans",
    code: "mono"
  }
} as const satisfies ThemeConfig;
