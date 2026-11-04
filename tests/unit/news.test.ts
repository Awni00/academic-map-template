import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { renderInlineMarkdown } from "../../src/lib/news/inlineMarkdown";
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
      { date: "May 2026", title: "First", titleHtml: "First", url: "/writing/a" }
    ]);
  });

  it("writes an unquoted YAML date as the day written, west of UTC too", async () => {
    // It used to render as "Thu Apr 30 2026 20:00:00 GMT-0400 ...".
    process.env.TZ = "America/Los_Angeles";
    const file = await newsFile("- date: 2026-05-01\n  title: Unquoted\n");
    await expect(loadNews({ enabled: true, maxItems: 5, path: file })).resolves.toEqual([
      { date: "2026-05-01", title: "Unquoted", titleHtml: "Unquoted" }
    ]);
  });
});

describe("inline Markdown in news titles", () => {
  const html = (source: string) => renderInlineMarkdown(source).html;

  it("renders emphasis, strong, code and links mixed with text", () => {
    expect(
      html(
        "Gave a talk on [*CoT Information*](/blog/cot-info) at the [FLaNN Seminar](https://flannseminars.github.io/)"
      )
    ).toBe(
      'Gave a talk on <a href="/blog/cot-info"><em>CoT Information</em></a> at the <a href="https://flannseminars.github.io/">FLaNN Seminar</a>'
    );
    expect(html("_em_ **strong** `x < y` snake_case_name")).toBe(
      "<em>em</em> <strong>strong</strong> <code>x &lt; y</code> snake_case_name"
    );
  });

  it("leaves a plain title as written", () => {
    expect(renderInlineMarkdown("Updated the example website.")).toEqual({
      html: "Updated the example website.",
      hasLink: false
    });
  });

  it("escapes raw HTML instead of passing it through", () => {
    expect(html('<img src=x onerror="alert(1)"> & <b>bold</b>')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &lt;b&gt;bold&lt;/b&gt;"
    );
    expect(html("[x](/a 'say \"<hi>\"')")).toBe('<a href="/a" title="say &quot;&lt;hi&gt;&quot;">x</a>');
  });

  it.each([
    ["an ordered list", "1. Paper accepted"],
    ["a bullet list", "- Paper accepted"],
    ["a heading", "# 1 on the leaderboard"],
    ["a block quote", "> quoted"],
    ["a thematic break", "---"],
    ["a fenced code block", "```js"]
  ])("keeps a title that starts like %s as one inline run", (_, source) => {
    expect(html(source)).toBe(source.replace(">", "&gt;"));
  });

  it("joins lines and paragraphs into one line", () => {
    expect(html("One\n\nTwo  \nThree")).toBe("One Two Three");
  });

  it.each([
    "[x](javascript:alert(1))",
    "[x](JavaScript:alert(1))",
    "[x](<java\tscript:alert(1)>)",
    "[x](&#106;avascript:alert(1))",
    "[x](data:text/html,hi)",
    "<javascript:alert(1)>"
  ])("refuses the link target in %s", (source) => {
    expect(() => html(source)).toThrow("is not allowed");
  });

  it("allows http(s), mailto and scheme-less targets", () => {
    for (const url of ["https://a.b", "http://a.b", "mailto:me@a.b", "/blog/x", "#news", "paper.pdf"]) {
      expect(html(`[x](${url})`)).toBe(`<a href="${url}">x</a>`);
    }
  });
});

describe("news entries with inline Markdown", () => {
  it("renders the title and keeps the whole-entry url when the title has no link", async () => {
    const file = await newsFile('- date: "May 2026"\n  title: "Released *Entry 1*"\n  url: "/writing/a"\n');
    await expect(loadNews({ enabled: true, maxItems: 5, path: file })).resolves.toEqual([
      { date: "May 2026", title: "Released *Entry 1*", titleHtml: "Released <em>Entry 1</em>", url: "/writing/a" }
    ]);
  });

  it("fails an entry with both a url and a link in its title, naming it", async () => {
    const file = await newsFile(
      '- date: "May 2026"\n  title: "Plain"\n- date: "Apr 2026"\n  title: "Talk at [FLaNN](https://flannseminars.github.io/)"\n  url: "/talks"\n'
    );
    await expect(loadNews({ enabled: true, maxItems: 5, path: file })).rejects.toThrow(
      `${file} item 2 ("Talk at [FLaNN](https://flannseminars.github.io/)") has both a url and a link in its title`
    );
  });

  it("refuses an unsafe link in a title or url, naming the entry", async () => {
    const inTitle = await newsFile('- date: "May 2026"\n  title: "[x](javascript:alert(1))"\n');
    await expect(loadNews({ enabled: true, maxItems: 5, path: inTitle })).rejects.toThrow(
      `${inTitle} item 1 ("[x](javascript:alert(1))"): Link target "javascript:alert(1)" is not allowed`
    );
    const inUrl = await newsFile('- date: "May 2026"\n  title: "x"\n  url: "javascript:alert(1)"\n');
    await expect(loadNews({ enabled: true, maxItems: 5, path: inUrl })).rejects.toThrow(
      'url "javascript:alert(1)" is not allowed'
    );
  });
});
