import { describe, expect, it } from "vitest";

import { highlightBibtex } from "../../src/lib/article/bibtexHighlight";

const record = [
  "@misc{doe2026example,",
  "  author = {Doe, Jane and Roe, Rich},",
  '  title = "A {Title} With Braces",',
  "  year = 2026",
  "}"
].join("\n");

const textOf = (kind: string) =>
  highlightBibtex(record)
    .filter((token) => token.kind === kind)
    .map((token) => token.text);

describe("highlightBibtex", () => {
  it("joins back to the record unchanged", () => {
    expect(highlightBibtex(record).map((token) => token.text).join("")).toBe(record);
  });

  it("marks the entry type, key and field names", () => {
    expect(textOf("type")).toEqual(["@misc"]);
    expect(textOf("key")).toEqual(["doe2026example"]);
    expect(textOf("field")).toEqual(["author", "title", "year"]);
  });

  it("keeps a value's outer delimiters apart from the value", () => {
    expect(textOf("value")).toEqual(["Doe, Jane and Roe, Rich", "A {Title} With Braces", "2026"]);
  });

  it("leaves lines it does not recognise as plain text", () => {
    const multiline = "@article{k,\n  title = {First line\n    second line},\n}";
    const tokens = highlightBibtex(multiline);
    expect(tokens.map((token) => token.text).join("")).toBe(multiline);
    expect(tokens.some((token) => token.kind === "plain" && token.text.includes("second line"))).toBe(
      true
    );
  });
});
