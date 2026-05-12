export const themeConfig = {
  defaultMode: "light" as "light" | "dark" | "system",
  allowToggle: true,
  typography: {
    body: "serif",
    ui: "sans",
    code: "mono"
  },
  /**
   * Visual treatment for <Theorem> / <Theorem kind="definition"> blocks.
   *   "rule" — top + bottom hairlines, small-caps mono label
   *   "slab" — accent left bar, label inline (default)
   *   "tag"  — accent-filled flag hanging from a top hairline
   *   "caps" — minimal Knuth-style run-in label, no chrome
   */
  theoremStyle: "slab" as "rule" | "slab" | "tag" | "caps"
} as const;
