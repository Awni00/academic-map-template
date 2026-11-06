import { describe, expect, it } from "vitest";

import { parsePublicationsYaml } from "../../src/lib/publications/loadPublications";
import { pageMeta, pageMetaIssues } from "../../src/lib/publications/pageMeta";
import type { Publication } from "../../src/lib/publications/types";

const [publication] = parsePublicationsYaml(`
- id: lovelace2026engines
  title: Notes on the Analytical Engine
  authors: [Ada Lovelace, Charles Babbage]
  year: 2026
  venue: Conference on Engines (CoE)
  award: Spotlight
  links:
    arxiv: "2601.00001"
    code: https://github.com/example/engines
    blog: /writing/engines
    slides: /slides/engines.pdf
    publisher: https://proceedings.example.org/coe-2026/engines
`).publications as [Publication];

describe("pageMeta", () => {
  it("takes venue, award and links from the page's publication", () => {
    const meta = pageMeta(publication, {});
    expect(meta.venue).toBe("Conference on Engines (CoE)");
    expect(meta.award).toBe("Spotlight");
    // The publications list's order and labels, without the link back to the page.
    expect(meta.links).toEqual([
      { kind: "arxiv", label: "arXiv", href: "https://arxiv.org/abs/2601.00001" },
      { kind: "code", label: "Code", href: "https://github.com/example/engines" },
      { kind: "slides", label: "Slides", href: "/slides/engines.pdf" },
      { kind: "publisher", label: "CoE", href: "https://proceedings.example.org/coe-2026/engines" }
    ]);
  });

  it("ignores frontmatter the publication has a value for", () => {
    const meta = pageMeta(publication, {
      venue: "Engines 2026",
      award: "Oral",
      external: { code: "https://github.com/example/old", arxiv: "2601.99999" }
    });
    expect(meta.venue).toBe("Conference on Engines (CoE)");
    expect(meta.award).toBe("Spotlight");
    expect(meta.links.map((link) => link.href)).not.toContain("https://github.com/example/old");
    expect(meta.links.filter((link) => link.kind === "arxiv")).toHaveLength(1);
  });

  it("fills in from frontmatter what the publication leaves out", () => {
    const bare = { ...publication, venue: undefined, award: undefined };
    const meta = pageMeta(bare, {
      venue: "Workshop on Engines (WoE)",
      award: "Best Paper",
      external: { video: "https://example.com/talk" }
    });
    expect(meta.venue).toBe("Workshop on Engines (WoE)");
    expect(meta.award).toBe("Best Paper");
    expect(meta.links.at(-1)).toEqual({ kind: "video", label: "Video", href: "https://example.com/talk" });
  });

  it("uses frontmatter alone on a page with no publication", () => {
    const meta = pageMeta(undefined, {
      venue: "Journal of Engines (JoE)",
      external: { publisher_page: "https://joe.example.org/1", arxiv: "2601.00002", doi: "10.1000/joe.1", paper: "/p.pdf" }
    });
    expect(meta.venue).toBe("Journal of Engines (JoE)");
    expect(meta.award).toBeUndefined();
    // Frontmatter order; bare ids become URLs; the publisher link is named by the venue's acronym.
    expect(meta.links).toEqual([
      { kind: "publisher", label: "JoE", href: "https://joe.example.org/1" },
      { kind: "arxiv", label: "arXiv", href: "https://arxiv.org/abs/2601.00002" },
      { kind: "doi", label: "DOI", href: "https://doi.org/10.1000/joe.1" },
      { kind: "pdf", label: "Paper", href: "/p.pdf" }
    ]);
    expect(pageMeta(undefined, { external: { publisher_page: "https://x.org" } }).links[0].label).toBe("Published");
    expect(pageMeta(undefined, {})).toEqual({ venue: undefined, award: undefined, links: [] });
  });
});

describe("pageMetaIssues", () => {
  it("has nothing to report when the frontmatter leaves these to the publication", () => {
    expect(pageMetaIssues(publication, {})).toEqual([]);
    expect(pageMetaIssues(publication, { venue: "  ", external: { code: "" } })).toEqual([]);
  });

  it("reports frontmatter that repeats the publication", () => {
    const issues = pageMetaIssues(publication, {
      venue: "Conference on Engines (CoE)",
      award: "spotlight",
      external: {
        arxiv: "https://arxiv.org/abs/2601.00001v2",
        code: "https://github.com/example/engines/",
        publisher_page: "http://www.proceedings.example.org/coe-2026/engines"
      }
    });
    expect(issues.map((issue) => issue.severity)).toEqual(["error", "error", "error", "error", "error"]);
    expect(issues.every((issue) => /repeats publication "lovelace2026engines".*Remove it\./.test(issue.message))).toBe(true);
    expect(issues.map((issue) => issue.message.match(/frontmatter "([^"]+)"/)![1])).toEqual([
      "venue",
      "award",
      "external.arxiv",
      "external.code",
      "external.publisher_page"
    ]);
  });

  it("reports frontmatter that contradicts the publication, naming both values", () => {
    const issues = pageMetaIssues(publication, {
      venue: "2026 Conference on Engines (CoE)",
      external: { slides: "/slides/old.pdf" }
    });
    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
    expect(issues[0].message).toContain(
      'frontmatter "venue" (2026 Conference on Engines (CoE)) contradicts publication "lovelace2026engines" (Conference on Engines (CoE))'
    );
    expect(issues[1].message).toContain("(/slides/old.pdf) contradicts");
    expect(issues[1].message).toContain("(/slides/engines.pdf)");
  });

  it("warns about frontmatter the publication lacks, which the publications list leaves out", () => {
    const issues = pageMetaIssues(
      { ...publication, award: undefined },
      { award: "Oral", external: { video: "https://example.com/talk" } }
    );
    expect(issues.map((issue) => issue.severity)).toEqual(["warning", "warning"]);
    expect(issues[0].message).toMatch(/frontmatter "award" is shown on the page but publication "lovelace2026engines" has none/);
    expect(issues[1].message).toMatch(/frontmatter "external.video"/);
  });
});
