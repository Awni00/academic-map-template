import { describe, expect, it } from "vitest";

import { groupPublications } from "../../src/lib/publications/formatPublication";
import { parseBibtex } from "../../src/lib/publications/parseBibtex";

const bibtex = `@inproceedings{sample2026,
  title = {Sample Paper},
  author = {Your Name and Coauthor Name},
  booktitle = {Conference},
  year = {2026},
  pages = {1--10},
  doi = {10.0000/sample},
  abstract = {Site-only summary},
  abbr = {CONF},
  selected = {true},
  bibtex_show = {true},
  preview = {sample.svg},
  pdf = {/publications/sample.pdf},
  arxiv = {2601.00000},
  code = {https://github.com/example/sample}
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

  it("generates concise BibTeX with only standard citation fields", () => {
    const [publication] = parseBibtex(bibtex);

    expect(publication.bibtex).toBe(`@inproceedings{sample2026,
  author = {Your Name and Coauthor Name},
  title = {Sample Paper},
  booktitle = {Conference},
  year = {2026},
  pages = {1--10},
  doi = {10.0000/sample}
}`);
    expect(publication.raw).toContain("selected");
    expect(publication.bibtex).not.toContain("selected");
    expect(publication.bibtex).not.toContain("bibtex_show");
    expect(publication.bibtex).not.toContain("preview");
    expect(publication.bibtex).not.toContain("pdf");
    expect(publication.bibtex).not.toContain("arxiv");
    expect(publication.bibtex).not.toContain("code");
    expect(publication.bibtex).not.toContain("abstract");
    expect(publication.bibtex).not.toContain("abbr");
  });

  it("generates concise BibTeX for misc entries", () => {
    const [publication] = parseBibtex(`@misc{sampleMisc,
      title = {Dataset Card},
      author = {Researcher Name},
      year = {2024},
      howpublished = {Online},
      note = {Accessed 2026-05-15},
      eprint = {2601.00000},
      archivePrefix = {arXiv},
      primaryClass = {cs.LG},
      website = {https://example.com},
      selected = {true}
    }`);

    expect(publication.bibtex).toBe(`@misc{sampleMisc,
  author = {Researcher Name},
  title = {Dataset Card},
  year = {2024},
  howpublished = {Online},
  note = {Accessed 2026-05-15},
  eprint = {2601.00000},
  archiveprefix = {arXiv},
  primaryclass = {cs.LG}
}`);
    expect(publication.bibtex).not.toContain("website");
    expect(publication.bibtex).not.toContain("selected");
  });

  it("groups by year descending", () => {
    expect(groupPublications(parseBibtex(bibtex)).map((group) => group.label)).toEqual(["2026", "2025"]);
  });
});
