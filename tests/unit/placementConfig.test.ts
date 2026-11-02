import { describe, expect, it, vi } from "vitest";

// A site that sets only `byType.hub.related` must keep the hub entry type's
// own `toc` and `localGraph` placement, not replace it.
vi.mock("../../src/site/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/site/config")>();
  return {
    ...actual,
    siteConfigOverrides: {
      ...actual.siteConfigOverrides,
      writing: {
        ...actual.siteConfigOverrides.writing,
        entryLayout: {
          placement: {
            byType: {
              hub: { related: { withLocalGraph: true } },
              paper: { related: { where: "none" } }
            }
          }
        }
      }
    }
  };
});

const { writingConfig, mergePlacementByType } = await import("../../src/config/resolve");

describe("placement config resolution", () => {
  it("merges the site's byType into the entry type's placement field by field", () => {
    expect(writingConfig.entryLayout.placement.byType.hub).toEqual({
      toc: { where: "none" },
      localGraph: { where: "header" },
      related: { withLocalGraph: true }
    });
    expect(writingConfig.entryLayout.placement.byType.paper).toEqual({
      related: { where: "none" }
    });
  });

  it("keeps the defaults for the related list", () => {
    expect(writingConfig.entryLayout.placement.default.related).toEqual({
      where: "footer",
      withLocalGraph: false
    });
    expect(writingConfig.entryLayout.placement.default).not.toHaveProperty("linkedFrom");
    expect(writingConfig.entryLayout).not.toHaveProperty("hubPages");
  });

  it("merges nested fields within one placement key", () => {
    expect(
      mergePlacementByType(
        { hub: { related: { where: "none" } } },
        { hub: { related: { withLocalGraph: true } }, note: { toc: { where: "right" } } }
      )
    ).toEqual({
      hub: { related: { where: "none", withLocalGraph: true } },
      note: { toc: { where: "right" } }
    });
  });
});
