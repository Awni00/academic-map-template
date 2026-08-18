import { describe, expect, it, vi } from "vitest";

// `resolveArticleMode` reads the resolved writing config at module scope,
// matching its sibling resolvers. Stub the mode block so all three arms of
// the cascade are reachable: "paper" exercises byType, "note" falls through
// to the default, and frontmatter overrides both.
vi.mock("../../src/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/config")>();
  return {
    ...actual,
    writingConfig: {
      ...actual.writingConfig,
      entryLayout: {
        ...actual.writingConfig.entryLayout,
        mode: {
          default: "article",
          byType: { paper: "abstract" }
        }
      }
    }
  };
});

const { resolveArticleMode } = await import("../../src/lib/article/placement");

import type { WritingEntryLike } from "../../src/lib/graph/types";

describe("article mode resolution", () => {
  it("falls back to the global default for types with no override", () => {
    expect(resolveArticleMode(entry("note"))).toBe("article");
  });

  it("applies the type-level mode", () => {
    expect(resolveArticleMode(entry("paper"))).toBe("abstract");
  });

  it("lets frontmatter override the type-level mode in both directions", () => {
    expect(resolveArticleMode(entry("paper", { mode: "article" }))).toBe("article");
    expect(resolveArticleMode(entry("note", { mode: "abstract" }))).toBe("abstract");
  });
});

function entry(type: string, article?: WritingEntryLike["data"]["article"]): WritingEntryLike {
  return {
    id: `${type}-entry`,
    body: "",
    data: {
      title: "Entry",
      type,
      article
    }
  } as WritingEntryLike;
}
