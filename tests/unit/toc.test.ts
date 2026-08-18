import { describe, expect, it } from "vitest";

import { writingConfig } from "../../src/config";
import {
  DEFAULT_TOC_CONFIG,
  filterHeadingsForToc,
  normalizeTocConfig,
  resolveTocConfig
} from "../../src/lib/article/toc";
import type { WritingEntryLike } from "../../src/lib/graph/types";
import type { WritingConfig } from "../../src/config/types";

const headings = [
  { depth: 1, slug: "title", text: "Title" },
  { depth: 2, slug: "setup", text: "Setup" },
  { depth: 3, slug: "detail", text: "Detail" },
  { depth: 4, slug: "example", text: "Example" },
  { depth: 5, slug: "case", text: "Case" },
  { depth: 6, slug: "note", text: "Note" }
];

describe("article TOC depth config", () => {
  it("keeps the existing h2/h3 default", () => {
    expect(filterHeadingsForToc(headings, DEFAULT_TOC_CONFIG).map((heading) => heading.slug)).toEqual([
      "setup",
      "detail"
    ]);
  });

  it("includes h4 when maxDepth is 4", () => {
    const config = normalizeTocConfig({ maxDepth: 4 }, DEFAULT_TOC_CONFIG);
    expect(filterHeadingsForToc(headings, config).map((heading) => heading.slug)).toEqual([
      "setup",
      "detail",
      "example"
    ]);
  });

  it("excludes h2 when minDepth is 3", () => {
    const config = normalizeTocConfig({ minDepth: 3 }, { minDepth: 2, maxDepth: 4 });
    expect(filterHeadingsForToc(headings, config).map((heading) => heading.slug)).toEqual([
      "detail",
      "example"
    ]);
  });

  it("rejects invalid TOC depths", () => {
    expect(() => normalizeTocConfig({ minDepth: 1 as never })).toThrow(/2 through 6/);
    expect(() => normalizeTocConfig({ maxDepth: 7 as never })).toThrow(/2 through 6/);
    expect(() => normalizeTocConfig({ minDepth: 5, maxDepth: 3 })).toThrow(
      /less than or equal/
    );
  });

  it("resolves the default config from writing config", () => {
    expect(resolveTocConfig(entry(), writingConfig)).toEqual({ minDepth: 2, maxDepth: 3 });
  });

  it("merges type-level and per-entry overrides", () => {
    const config: WritingConfig = {
      ...writingConfig,
      entryLayout: {
        ...writingConfig.entryLayout,
        toc: {
          default: { minDepth: 2, maxDepth: 3 },
          byType: {
            paper: { maxDepth: 4 }
          }
        }
      }
    };

    expect(resolveTocConfig(entry(), config)).toEqual({ minDepth: 2, maxDepth: 4 });
    expect(resolveTocConfig(entry({ toc: { minDepth: 3 } }), config)).toEqual({
      minDepth: 3,
      maxDepth: 4
    });
  });
});

function entry(article?: WritingEntryLike["data"]["article"]): WritingEntryLike {
  return {
    id: "paper",
    body: "",
    data: {
      title: "Paper",
      type: "paper",
      article
    }
  } as WritingEntryLike;
}
