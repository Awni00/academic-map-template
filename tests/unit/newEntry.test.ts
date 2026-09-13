import matter from "gray-matter";
import { afterEach, describe, expect, it } from "vitest";

import { localDateString, newEntryFrontmatter, newEntryPath } from "../../scripts/lib/new-entry";

describe("new entry frontmatter", () => {
  it.each([
    ["LaTeX with an unknown YAML escape", "Why \\sqrt{n}"],
    ["LaTeX with a valid YAML escape", "The $\\alpha$-divergence"],
    ["a trailing backslash", "Ends with \\"],
    ["quotes", 'Say "hi"'],
    ["a Windows path", "Path C:\\temp\\"]
  ])("round-trips a title with %s", (_, title) => {
    const { data } = matter(newEntryFrontmatter(title, "note", "2026-09-12"));
    expect(data).toMatchObject({ title, type: "note", date: "2026-09-12", draft: true });
  });
});

describe("new entry path", () => {
  it("keeps a title to one path segment", () => {
    expect(newEntryPath({ title: "Encoder/Decoder Models" })).toBe("encoder-decoder-models");
    expect(newEntryPath({ title: "The $\\alpha$-divergence" })).toBe("the-alpha-divergence");
  });

  it("does not read a dotted title as a file extension", () => {
    expect(newEntryPath({ title: "Version 2.0 Release" })).toBe("version-20-release");
  });

  it("lets an explicit path nest folders", () => {
    expect(newEntryPath({ title: "My Note", path: "learning/my-note" })).toBe("learning/my-note");
    expect(newEntryPath({ title: "My Note", slug: "my-note" })).toBe("my-note");
  });

  it("leaves nothing for a title that names the index", () => {
    expect(newEntryPath({ title: "Index" })).toBe("");
  });
});

describe("new entry date", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("uses the local day, not the UTC one", () => {
    // 19:30 in Los Angeles is already the next day in UTC.
    process.env.TZ = "America/Los_Angeles";
    expect(localDateString(new Date(2026, 8, 12, 19, 30))).toBe("2026-09-12");
  });
});
