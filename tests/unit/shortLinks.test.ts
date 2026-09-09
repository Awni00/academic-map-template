import { describe, expect, it } from "vitest";

import {
  buildReservedRoutes,
  normalizeShortUrl,
  resolveShortLinks,
  type ShortLinkSource
} from "../../src/lib/routes/shortLinks";

const reserved = buildReservedRoutes({
  writingIds: ["hub-1/index", "hub-1/entry-1"],
  pageIds: ["home", "research"]
});

function sources(...entries: Array<[string, string]>): ShortLinkSource[] {
  return entries.map(([id, shortUrl]) => ({ id, data: { shortUrl } }));
}

describe("short links", () => {
  it("normalizes short URLs with or without a leading slash", () => {
    expect(normalizeShortUrl("project-name")).toBe("/project-name");
    expect(normalizeShortUrl("/project-name/")).toBe("/project-name");
    expect(normalizeShortUrl("  /p/project-name  ")).toBe("/p/project-name");
  });

  it("points a short URL at the entry's canonical writing URL", () => {
    const { redirects, issues } = resolveShortLinks(sources(["hub-4/hub-5/index", "/project-name"]));
    expect(issues).toEqual([]);
    expect(redirects).toEqual({ "/project-name": "/writing/hub-4/hub-5" });
  });

  it("accepts multi-segment short URLs so links can be namespaced", () => {
    const { redirects } = resolveShortLinks(sources(["hub-1/entry-2", "/p/entry-two"]));
    expect(redirects).toEqual({ "/p/entry-two": "/writing/hub-1/entry-2" });
  });

  it("ignores entries with no short URL", () => {
    const { redirects, issues } = resolveShortLinks([{ id: "hub-1/index", data: {} }]);
    expect(redirects).toEqual({});
    expect(issues).toEqual([]);
  });

  it("rejects malformed short URLs", () => {
    const { redirects, issues } = resolveShortLinks(sources(["hub-2/index", "/Project Name"]));
    expect(redirects).toEqual({});
    expect(issues).toContainEqual(
      expect.objectContaining({ entry: "hub-2/index", shortUrl: "/Project Name" })
    );
  });

  it("rejects a short URL claimed by two entries", () => {
    const { redirects, issues } = resolveShortLinks(
      sources(["a/index", "/shared"], ["b/index", "/shared"])
    );
    expect(redirects).toEqual({ "/shared": "/writing/a" });
    expect(issues).toContainEqual(
      expect.objectContaining({ entry: "b/index", shortUrl: "/shared" })
    );
    expect(issues[0].message).toContain('already claimed by "a/index"');
  });

  it("rejects a short URL that collides with a custom page", () => {
    const { redirects, issues } = resolveShortLinks(sources(["hub-2/index", "/research"]), reserved);
    expect(redirects).toEqual({});
    expect(issues[0].message).toContain('page "research"');
  });

  it("rejects a short URL that collides with the writing browser or an entry", () => {
    const { issues } = resolveShortLinks(
      sources(["a/index", "/writing"], ["b/index", "/writing/hub-1/entry-1"]),
      reserved
    );
    expect(issues.map((issue) => issue.entry)).toEqual(["a/index", "b/index"]);
    expect(issues[0].message).toContain("the writing browser");
    expect(issues[1].message).toContain('writing entry "hub-1/entry-1"');
  });

  it("keeps valid short URLs when another entry's is rejected", () => {
    const { redirects, issues } = resolveShortLinks(
      sources(["a/index", "/research"], ["b/index", "/project-name"]),
      reserved
    );
    expect(redirects).toEqual({ "/project-name": "/writing/b" });
    expect(issues).toHaveLength(1);
  });
});
