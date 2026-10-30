import { describe, expect, it } from "vitest";

import type { EntryNode } from "../../src/lib/graph/types";
import { selectRecentWriting } from "../../src/lib/home/recentWriting";

function node(id: string, date: string | undefined, extra: Partial<EntryNode> = {}): EntryNode {
  return {
    id,
    path: id,
    slug: id,
    title: id,
    type: "note",
    tags: [],
    date,
    url: `/writing/${id}`,
    ...extra
  };
}

const nodes = [
  node("old-featured", "2024-01-01", { featured: true }),
  node("newest", "2026-06-01"),
  node("middle", "2025-06-01"),
  node("new-featured", "2025-01-01", { featured: true }),
  node("undated-featured", undefined, { featured: true }),
  node("hub", "2026-07-01", { type: "hub" }),
  node("draft", "2026-08-01", { draft: true, featured: true })
];

const ids = (select: "recent" | "featured" | "featured-first", maxItems = 10) =>
  selectRecentWriting(nodes, {
    select,
    maxItems,
    includeType: (type) => type !== "hub"
  }).map((entry) => entry.id);

describe("homepage recent writing", () => {
  it("orders by date alone in recent mode", () => {
    expect(ids("recent")).toEqual(["newest", "middle", "new-featured", "old-featured"]);
  });

  it("puts featured entries first, newest first, then the rest", () => {
    expect(ids("featured-first")).toEqual(["new-featured", "old-featured", "newest", "middle"]);
  });

  it("shows only featured entries in featured mode", () => {
    expect(ids("featured")).toEqual(["new-featured", "old-featured"]);
  });

  it("never includes undated entries, drafts, or excluded types", () => {
    for (const mode of ["recent", "featured", "featured-first"] as const) {
      expect(ids(mode)).not.toContain("undated-featured");
      expect(ids(mode)).not.toContain("draft");
      expect(ids(mode)).not.toContain("hub");
    }
  });

  it("caps the row at maxItems", () => {
    expect(ids("featured-first", 3)).toEqual(["new-featured", "old-featured", "newest"]);
    expect(ids("recent", 0)).toEqual([]);
  });

  it("breaks date ties by title so every build agrees", () => {
    const tied = [node("b", "2026-01-01"), node("a", "2026-01-01")];
    const order = selectRecentWriting(tied, { select: "recent", maxItems: 5, includeType: () => true });
    expect(order.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
