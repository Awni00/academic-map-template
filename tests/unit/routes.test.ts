import { describe, expect, it } from "vitest";

import { pageUrlFromId, pathEntrySlug, writingEntryUrl, writingFocusUrl } from "../../src/lib/routes/paths";

describe("route helpers", () => {
  it("creates writing URLs from the configurable route", () => {
    expect(writingEntryUrl("example-paper")).toBe("/writing/example-paper");
    expect(writingFocusUrl("ml-theory")).toBe("/writing?focus=ml-theory");
    expect(pathEntrySlug("writing/example-paper")).toBe("example-paper");
  });

  it("maps custom page ids to public URLs", () => {
    expect(pageUrlFromId("home")).toBe("/");
    expect(pageUrlFromId("foo/bar")).toBe("/foo/bar");
  });
});
