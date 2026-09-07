import { describe, expect, it } from "vitest";

import { pageUrlFromId, pathEntrySlug, writingEntryUrl, writingFocusUrl } from "../../src/lib/routes/paths";

describe("route helpers", () => {
  it("creates writing URLs from the configurable route", () => {
    expect(writingEntryUrl("hub-4/hub-5")).toBe("/writing/hub-4/hub-5");
    expect(writingFocusUrl("hub-4/hub-5")).toBe("/writing?focus=hub-4%2Fhub-5");
    expect(pathEntrySlug("writing/hub-4/hub-5")).toBe("hub-4/hub-5");
  });

  it("maps custom page ids to public URLs", () => {
    expect(pageUrlFromId("home")).toBe("/");
    expect(pageUrlFromId("foo/bar")).toBe("/foo/bar");
  });
});
