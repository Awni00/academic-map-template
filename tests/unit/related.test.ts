import { describe, expect, it, vi } from "vitest";

// Stub the resolved placement config so every level of the cascade is
// reachable: "hub" has a header map, "teaching" has none, "paper" opts into
// showing the list beside its footer map, and "note" falls through.
vi.mock("../../src/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/config")>();
  return {
    ...actual,
    writingConfig: {
      ...actual.writingConfig,
      entryLayout: {
        ...actual.writingConfig.entryLayout,
        placement: {
          default: {
            toc: { where: "left" },
            localGraph: { where: "footer" },
            related: { where: "footer", withLocalGraph: false }
          },
          byType: {
            hub: { toc: { where: "none" }, localGraph: { where: "header" } },
            teaching: { localGraph: { where: "none" } },
            paper: { related: { withLocalGraph: true } }
          }
        }
      }
    }
  };
});

const { resolvePlacement, showRelatedList } = await import("../../src/lib/article/placement");
const { relatedEntries } = await import("../../src/lib/article/related");
const { legacyPlacementWarnings } = await import("../../src/lib/article/legacyPlacement");

import type { WritingEntryLike } from "../../src/lib/graph/types";

describe("related entries", () => {
  const byId = new Map(
    [
      ["hub", "Hub"],
      ["a", "Beta paper"],
      ["b", "alpha paper"],
      ["c", "Gamma note"]
    ].map(([id, title]) => [id, { title, url: `/writing/${id}/` }])
  );

  it("lists links in both directions once each, sorted by title", () => {
    // The hub links to its papers and the papers link back: the case that
    // used to render two identical lists.
    const graph = {
      linksTo: { hub: ["a", "b"] },
      linkedFrom: { hub: ["a", "b", "c"] }
    };
    expect(relatedEntries(graph, byId, "hub").map((item) => item.id)).toEqual(["b", "a", "c"]);
  });

  it("has no cap, skips self-links and unknown ids", () => {
    const graph = {
      linksTo: { hub: ["hub", "a", "missing"] },
      linkedFrom: { hub: ["b", "c"] }
    };
    expect(relatedEntries(graph, byId, "hub")).toEqual([
      { id: "b", title: "alpha paper", url: "/writing/b/" },
      { id: "a", title: "Beta paper", url: "/writing/a/" },
      { id: "c", title: "Gamma note", url: "/writing/c/" }
    ]);
  });

  it("is empty for an unlinked entry", () => {
    expect(relatedEntries({ linksTo: {}, linkedFrom: {} }, byId, "a")).toEqual([]);
  });
});

describe("related list visibility", () => {
  it("hides the list wherever the page shows a local graph, header or footer", () => {
    expect(showRelatedList(resolvePlacement(entry("hub")))).toBe(false);
    expect(showRelatedList(resolvePlacement(entry("note")))).toBe(false);
  });

  it("shows the list on pages without a graph", () => {
    expect(showRelatedList(resolvePlacement(entry("teaching")))).toBe(true);
    expect(
      showRelatedList(resolvePlacement(entry("note", { placement: { localGraph: { where: "none" } } })))
    ).toBe(true);
  });

  it("shows it beside the graph when withLocalGraph is set by type or frontmatter", () => {
    expect(showRelatedList(resolvePlacement(entry("paper")))).toBe(true);
    expect(
      showRelatedList(resolvePlacement(entry("hub", { placement: { related: { withLocalGraph: true } } })))
    ).toBe(true);
  });

  it("where: none always wins", () => {
    expect(
      showRelatedList(resolvePlacement(entry("teaching", { placement: { related: { where: "none" } } })))
    ).toBe(false);
    expect(
      showRelatedList(resolvePlacement(entry("paper", { placement: { related: { where: "none" } } })))
    ).toBe(false);
  });

  it("maps legacy side-rail values to the footer", () => {
    for (const where of ["left", "right", "sidebar"] as const) {
      expect(resolvePlacement(entry("teaching", { placement: { related: { where } } })).related.where).toBe(
        "footer"
      );
    }
  });

  it("does not expose a linked-from placement", () => {
    expect(resolvePlacement(entry("note"))).not.toHaveProperty("linkedFrom");
  });
});

describe("legacy placement warnings", () => {
  it("flags linkedFrom and side-rail related values", () => {
    const warnings = legacyPlacementWarnings(
      { linkedFrom: { where: "footer" }, related: { where: "left" } },
      "hub-1/index"
    );
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("hub-1/index: placement.linkedFrom");
    expect(warnings[1]).toContain('"left"');
  });

  it("accepts current values", () => {
    expect(legacyPlacementWarnings({ related: { where: "none", withLocalGraph: true } }, "x")).toEqual([]);
    expect(legacyPlacementWarnings(undefined, "x")).toEqual([]);
  });
});

function entry(type: string, article?: WritingEntryLike["data"]["article"]): WritingEntryLike {
  return {
    id: `${type}-entry`,
    body: "",
    data: { title: "Entry", type, article }
  } as WritingEntryLike;
}
