import type {
  EntryType,
  TocConfig,
  TocConfigOverride,
  TocDepth,
  WritingConfig
} from "../../config/types";
import type { WritingEntryLike } from "../graph/types";

export type TocHeading = { depth: number; slug: string; text: string };
type TocConfigInput = {
  minDepth?: unknown;
  maxDepth?: unknown;
};

export const DEFAULT_TOC_CONFIG = {
  minDepth: 2,
  maxDepth: 3
} satisfies TocConfig;

export function isTocDepth(value: unknown): value is TocDepth {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 2 &&
    value <= 6
  );
}

export function normalizeTocConfig(
  override: TocConfigInput | TocConfigOverride | undefined,
  fallback: TocConfig = DEFAULT_TOC_CONFIG,
  label = "toc"
): TocConfig {
  const minDepth = override?.minDepth ?? fallback.minDepth;
  const maxDepth = override?.maxDepth ?? fallback.maxDepth;

  validateTocDepth(minDepth, `${label}.minDepth`);
  validateTocDepth(maxDepth, `${label}.maxDepth`);

  if (minDepth > maxDepth) {
    throw new Error(`${label}.minDepth must be less than or equal to ${label}.maxDepth.`);
  }

  return { minDepth, maxDepth };
}

export function resolveTocConfig(entry: WritingEntryLike, config: WritingConfig): TocConfig {
  const type = entry.data.type as EntryType;
  const tocConfig = config.entryLayout.toc;
  const fromDefault = normalizeTocConfig(
    tocConfig.default,
    DEFAULT_TOC_CONFIG,
    "writing.entryLayout.toc.default"
  );
  const fromType = normalizeTocConfig(
    tocConfig.byType[type],
    fromDefault,
    `writing.entryLayout.toc.byType.${type}`
  );
  return normalizeTocConfig(entry.data.article?.toc, fromType, "article.toc");
}

export function filterHeadingsForToc(
  headings: readonly TocHeading[],
  config: TocConfig
): TocHeading[] {
  return headings.filter(
    (heading) => heading.depth >= config.minDepth && heading.depth <= config.maxDepth
  );
}

function validateTocDepth(value: unknown, label: string): asserts value is TocDepth {
  if (!isTocDepth(value)) {
    throw new Error(`${label} must be an integer from 2 through 6.`);
  }
}
