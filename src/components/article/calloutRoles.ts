/**
 * The theme tokens behind each callout role.
 *
 * Spelled out rather than built as `var(--color-${role}-text)`: that template
 * once pointed three callout types at `--color-accent-text`, a token no theme
 * defines, and the titles silently fell back to body text. A literal table can
 * be checked against the tokens themes actually emit, which
 * tests/unit/themes.test.ts does.
 *
 * `accent` paints the rule and icon (graphic elements, 3:1); `text` paints the
 * title (text, 4.5:1). `accent` needs no separate text token because the theme
 * accent is link colour and is already held to 4.5:1.
 */
export const CALLOUT_ROLE_COLORS = {
  accent: { accent: "var(--color-accent)", text: "var(--color-accent)" },
  info: { accent: "var(--color-info)", text: "var(--color-info-text)" },
  success: { accent: "var(--color-success)", text: "var(--color-success-text)" },
  warning: { accent: "var(--color-warning)", text: "var(--color-warning-text)" },
  danger: { accent: "var(--color-danger)", text: "var(--color-danger-text)" },
  example: { accent: "var(--color-example)", text: "var(--color-example-text)" },
  quote: { accent: "var(--color-quote)", text: "var(--color-quote-text)" }
} as const satisfies Record<string, { accent: string; text: string }>;

export type CalloutRole = keyof typeof CALLOUT_ROLE_COLORS;
