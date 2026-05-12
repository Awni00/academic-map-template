import { describe, expect, it } from "vitest";

import { groupPublications } from "../../src/lib/publications/formatPublication";
import { parseBibtex } from "../../src/lib/publications/parseBibtex";

const bibtex = `@inproceedings{sample2026,
  title = {Sample Paper},
  author = {Your Name and Coauthor Name},
  booktitle = {Conference},
  year = {2026},
  selected = {true},
  bibtex_show = {true},
  preview = {sample.svg}
}

@article{sample2025,
  title = {Earlier Paper},
  author = {Other Author},
  journal = {Journal},
  year = {2025}
}`;

describe("publications", () => {
  it("parses custom fields and preview paths", () => {
    const publications = parseBibtex(bibtex);
    expect(publications[0]).toMatchObject({
      id: "sample2026",
      title: "Sample Paper",
      selected: true,
      bibtexShow: true,
      preview: "/publications/sample.svg"
    });
  });

  it("groups by year descending", () => {
    expect(groupPublications(parseBibtex(bibtex)).map((group) => group.label)).toEqual(["2026", "2025"]);
  });
});
