import { describe, expect, it } from "vitest";

import {
  pageUrlFromId,
  pathEntrySlug,
  rssFeed,
  writingEntryUrl,
  writingRoute
} from "../../src/lib/routes/paths";

describe("route helpers", () => {
  it("creates writing URLs from the configurable route", () => {
    expect(writingEntryUrl("hub-4/hub-5")).toBe("/writing/hub-4/hub-5");
    expect(pathEntrySlug("writing/hub-4/hub-5")).toBe("hub-4/hub-5");
  });

  it("maps custom page ids to public URLs", () => {
    expect(pageUrlFromId("home")).toBe("/");
    expect(pageUrlFromId("foo/bar")).toBe("/foo/bar");
  });

  it("links to the writing browser at the configured route", () => {
    expect(writingRoute()).toBe("/writing");
    expect(writingRoute("/notes")).toBe("/notes");
    expect(writingRoute("notes/")).toBe("/notes");
  });
});

describe("RSS feed route", () => {
  it("builds and links the feed at the configured route", () => {
    expect(rssFeed()).toEqual({ param: "writing/rss", href: "/writing/rss.xml" });
    expect(rssFeed({ enabled: true, route: "/notes/rss.xml" })).toEqual({
      param: "notes/rss",
      href: "/notes/rss.xml"
    });
  });

  it("links to the .xml file the feed page builds, whatever the route says", () => {
    expect(rssFeed({ enabled: true, route: "feed" })?.href).toBe("/feed.xml");
  });

  it("has no feed when RSS is disabled", () => {
    expect(rssFeed({ enabled: false, route: "/writing/rss.xml" })).toBeUndefined();
  });
});
