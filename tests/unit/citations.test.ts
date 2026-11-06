import path from "node:path";
import { describe, expect, it } from "vitest";

import { cleanLatex, formatCitation, formatCitationAuthors } from "../../src/lib/citations/citations";
import { remarkHoverNotes } from "../../src/lib/citations/remarkHoverNotes";
import { parseBibtex } from "../../src/lib/publications/parseBibtex";

describe("cleanLatex", () => {
  it("drops case-protection braces and decodes accents and escapes", () => {
    expect(cleanLatex("{BERT}: Pre-training")).toBe("BERT: Pre-training");
    expect(cleanLatex('Sch{\\"o}lkopf')).toBe("Schölkopf");
    expect(cleanLatex("Kaiser, {\\L}ukasz")).toBe("Kaiser, Łukasz");
    expect(cleanLatex("Erd\\H{o}s and Fran\\c{c}ois")).toBe("Erdős and François");
    expect(cleanLatex("Pages 1--10 \\& more")).toBe("Pages 1–10 & more");
  });
});

describe("formatCitationAuthors", () => {
  it("joins names and shortens long lists", () => {
    expect(formatCitationAuthors(["Ashish Vaswani", "Noam Shazeer"])).toBe("Ashish Vaswani, Noam Shazeer");
    expect(formatCitationAuthors(["X A", "Y B", "Z C", "W D"])).toBe("X A, Y B, et al.");
    expect(formatCitationAuthors(["Martin Luther King, Jr."])).toBe("Martin Luther King, Jr.");
  });
});

describe("formatCitation", () => {
  it("links an arXiv eprint when the entry has no other link", () => {
    const [entry] = parseBibtex(`@article{devlin2018bert,
      title={{BERT}: Pre-training},
      author={Devlin, Jacob and Chang, Ming-Wei},
      journal={arXiv preprint},
      year={2018},
      eprint={1810.04805},
      archivePrefix={arXiv}
    }`);
    expect(formatCitation(entry)).toMatchObject({
      title: "BERT: Pre-training",
      authors: "Jacob Devlin, Ming-Wei Chang",
      venue: "arXiv preprint",
      year: "2018",
      link: { label: "arXiv", href: "https://arxiv.org/abs/1810.04805" }
    });
  });
});

type Attribute = { type: string; name: string; value: string };
type Note = { type: string; name: string; attributes: Attribute[] };

function note(attributes: Record<string, string> = {}, name = "HoverNote"): Note {
  return {
    type: "mdxJsxTextElement",
    name,
    attributes: Object.entries(attributes).map(([name, value]) => ({ type: "mdxJsxAttribute", name, value }))
  };
}

function run(notes: Note[], frontmatter: Record<string, unknown> = {}) {
  const tree = { type: "root", children: [{ type: "paragraph", children: notes }] };
  const file = { path: path.resolve("src/data/page.mdx"), data: { astro: { frontmatter } } };
  remarkHoverNotes()(tree, file);
  return notes.map((n) => Object.fromEntries(n.attributes.map((a) => [a.name, a.value])));
}

describe("remarkHoverNotes", () => {
  it("numbers unmarked notes in order and reuses a repeated cite's number", () => {
    const props = run([note({ cite: "a" }), note({ mark: "†" }), note(), note({ cite: "a" }), note({ cite: "b" })]);
    expect(props.map((p) => p.mark)).toEqual(["1", "†", "2", "1", "3"]);
  });

  it("applies frontmatter defaults without overriding a note's own props", () => {
    const props = run([note(), note({ marker: "superscript" })], {
      hoverNotes: { marker: "bracket", appearance: "inverted" }
    });
    expect(props[0]).toMatchObject({ marker: "bracket", appearance: "inverted" });
    expect(props[1]).toMatchObject({ marker: "superscript", appearance: "inverted" });
  });

  it("resolves bibliography paths relative to the page and passes them to citing notes", () => {
    const [citing, plain] = run([note({ cite: "x" }), note()], { bibliography: "../../tests/fixtures/references.bib" });
    expect(JSON.parse(citing.bibliography)).toEqual([path.resolve("tests/fixtures/references.bib")]);
    expect(plain.bibliography).toBeUndefined();
  });

  it("names a bibliography file that does not exist", () => {
    expect(() => run([note({ cite: "x" })], { bibliography: "missing.bib" })).toThrow(/missing\.bib/);
  });

  it("gives terms the page's underline and shared appearance, and never numbers them", () => {
    const [first, term, second, own] = run(
      [note(), note({ note: "x" }, "Term"), note(), note({ note: "y", underline: "dotted" }, "Term")],
      { hoverNotes: { appearance: "inverted" }, terms: { underline: "none" } }
    );
    expect([first.mark, second.mark]).toEqual(["1", "2"]);
    expect(term).toEqual({ note: "x", underline: "none", appearance: "inverted" });
    expect(own).toMatchObject({ underline: "dotted", appearance: "inverted" });
  });
});
