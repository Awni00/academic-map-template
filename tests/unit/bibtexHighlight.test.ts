import { describe, expect, it } from "vitest";

import {
  highlightBibtex,
  type BibtexLine,
} from "../../src/lib/publications/bibtexHighlight";

const record = [
  "@misc{doe2026example,",
  "  author = {Doe, Jane and Roe, Rich},",
  '  title = "A {Title} With Braces",',
  "  year = 2026",
  "}",
].join("\n");

const joined = (lines: BibtexLine[]) =>
  lines
    .map((line) => [...line.lead, ...line.body].map((t) => t.text).join(""))
    .join("\n");

const textOf = (kind: string) =>
  highlightBibtex(record)
    .flatMap((line) => [...line.lead, ...line.body])
    .filter((token) => token.kind === kind)
    .map((token) => token.text);

describe("highlightBibtex", () => {
  it("joins back to the record unchanged", () => {
    expect(joined(highlightBibtex(record))).toBe(record);
  });

  it("marks the entry type, key and field names", () => {
    expect(textOf("type")).toEqual(["@misc"]);
    expect(textOf("key")).toEqual(["doe2026example"]);
    expect(textOf("field")).toEqual(["author", "title", "year"]);
  });

  it("keeps a value's outer delimiters apart from the value", () => {
    expect(textOf("value")).toEqual([
      "Doe, Jane and Roe, Rich",
      "A {Title} With Braces",
      "2026",
    ]);
  });

  it("puts a field's name, = and opening delimiter in its lead", () => {
    const author = highlightBibtex(record)[1];
    expect(author.lead.map((t) => t.text).join("")).toBe("  author = {");
    expect(author.body.map((t) => t.text).join("")).toBe(
      "Doe, Jane and Roe, Rich},",
    );
  });

  it("leaves lines it does not recognise as plain text", () => {
    const multiline =
      "@article{k,\n  title = {First line\n    second line},\n}";
    const lines = highlightBibtex(multiline);
    expect(joined(lines)).toBe(multiline);
    expect(lines[2]).toEqual({
      lead: [],
      body: [{ kind: "plain", text: "    second line}," }],
    });
  });
});
