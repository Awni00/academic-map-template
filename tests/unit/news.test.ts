import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadNews } from "../../src/lib/news/loadNews";

async function newsFile(contents: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "news-"));
  const file = path.join(dir, "news.yaml");
  await fs.writeFile(file, contents);
  return file;
}

describe("homepage news", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("does not read the file when news is disabled", async () => {
    const missing = path.join(os.tmpdir(), "no-such-dir", "news.yaml");
    await expect(loadNews({ enabled: false, maxItems: 5, path: missing })).resolves.toEqual([]);
  });

  it("names the file and the switch when enabled news has no file", async () => {
    const missing = path.join(os.tmpdir(), "no-such-dir", "news.yaml");
    await expect(loadNews({ enabled: true, maxItems: 5, path: missing })).rejects.toThrow(
      `Homepage news is enabled but ${missing} was not found`
    );
  });

  it.each([
    ["an empty file", ""],
    ["a file with only comments", "# nothing yet\n"]
  ])("treats %s as no news", async (_, contents) => {
    await expect(loadNews({ enabled: true, maxItems: 5, path: await newsFile(contents) })).resolves.toEqual([]);
  });

  it("rejects a file that is not a list", async () => {
    const file = await newsFile("date: May 2026\ntitle: One item\n");
    await expect(loadNews({ enabled: true, maxItems: 5, path: file })).rejects.toThrow("must be a list");
  });

  it("keeps quoted dates as written and caps the list", async () => {
    const file = await newsFile(
      '- date: "May 2026"\n  title: "First"\n  url: "/writing/a"\n- date: "Apr 2026"\n  title: "Second"\n'
    );
    await expect(loadNews({ enabled: true, maxItems: 1, path: file })).resolves.toEqual([
      { date: "May 2026", title: "First", url: "/writing/a" }
    ]);
  });

  it("writes an unquoted YAML date as the day written, west of UTC too", async () => {
    // It used to render as "Thu Apr 30 2026 20:00:00 GMT-0400 ...".
    process.env.TZ = "America/Los_Angeles";
    const file = await newsFile("- date: 2026-05-01\n  title: Unquoted\n");
    await expect(loadNews({ enabled: true, maxItems: 5, path: file })).resolves.toEqual([
      { date: "2026-05-01", title: "Unquoted" }
    ]);
  });
});
