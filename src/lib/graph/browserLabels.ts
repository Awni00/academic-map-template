import { writingConfig as resolvedWritingConfig, type WritingConfig } from "../../config/writing";

/**
 * The words the writing browser puts on screen, derived from `writing.label`
 * so a site that renames the section ("Blog") never shows "Writing".
 */
export function browserLabels(config: Pick<WritingConfig, "label" | "browser"> = resolvedWritingConfig) {
  return {
    heading: config.label,
    all: config.browser.labels.all ?? `All ${config.label.toLowerCase()}`
  };
}
