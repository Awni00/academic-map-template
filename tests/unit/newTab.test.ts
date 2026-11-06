import { describe, expect, it } from "vitest";

import { newTabAttrs, opensInNewTab } from "../../src/lib/routes/newTab";

const SITE = "https://example.com";

describe("opensInNewTab", () => {
  it("opens links to other sites in a new tab", () => {
    expect(opensInNewTab("https://arxiv.org/abs/2505.15927", SITE)).toBe(true);
    expect(opensInNewTab("http://github.com/x/y", SITE)).toBe(true);
    expect(opensInNewTab("//cdn.example.org/a", SITE)).toBe(true);
  });

  it("keeps the site's own pages in place, relative or absolute", () => {
    expect(opensInNewTab("/blog/cot-info", SITE)).toBe(false);
    expect(opensInNewTab("https://example.com/blog/cot-info", SITE)).toBe(false);
    expect(opensInNewTab("#bib", SITE)).toBe(false);
    expect(opensInNewTab("writing/entry", SITE)).toBe(false);
  });

  it("opens PDFs in a new tab wherever they live", () => {
    expect(opensInNewTab("/publications/slides/cotinfo-slides.pdf", SITE)).toBe(true);
    expect(opensInNewTab("https://example.com/cv.pdf#page=2", SITE)).toBe(true);
  });

  it("treats any absolute URL as off-site when the site URL is unknown", () => {
    expect(opensInNewTab("https://example.com/x")).toBe(true);
    expect(opensInNewTab("/x")).toBe(false);
  });

  it("adds noopener with the new tab", () => {
    expect(newTabAttrs("https://arxiv.org", SITE)).toEqual({ target: "_blank", rel: "noopener" });
    expect(newTabAttrs("/blog", SITE)).toEqual({});
  });
});
