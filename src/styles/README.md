# Styles

This directory contains global CSS, design tokens, article styles, and graph
styles.

Ownership: template-owned. Downstream sites should prefer theme and display
configuration before editing shared CSS. Direct style edits are local divergence
unless they are made upstream.

See [Repo Ownership](../../docs/repo-ownership.md) for the full policy.

Colour tokens (`--color-*`, `--graph-*`, `--placeholder-*`) and the shadow stack
are **not** in `tokens.css`. They are emitted per theme by
`src/components/layout/ThemeStyles.astro` from the two themes named in
`theme.light` / `theme.dark`. To change colours, pick a different theme or define
one in `src/site/themes.ts` — see [Theming](../../docs/theming.md). Everything
else in `tokens.css` (type scale, spacing, layout widths, radii, motion) is
shared by every theme and lives there.
