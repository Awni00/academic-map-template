import { describe, expect, it } from "vitest";

import { pageUrlFromId, pathEntrySlug, writingEntryUrl, writingFocusUrl } from "../../src/lib/routes/paths";

describe("route helpers", () => {
  it("creates writing URLs from the configurable route", () => {
    expect(writingEntryUrl("learning/quantum-mechanics")).toBe("/writing/learning/quantum-mechanics");
    expect(writingFocusUrl("learning/quantum-mechanics")).toBe("/writing?focus=learning%2Fquantum-mechanics");
    expect(pathEntrySlug("writing/learning/quantum-mechanics")).toBe("learning/quantum-mechanics");
  });

  it("maps custom page ids to public URLs", () => {
    expect(pageUrlFromId("home")).toBe("/");
    expect(pageUrlFromId("foo/bar")).toBe("/foo/bar");
  });
});
