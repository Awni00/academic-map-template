import { describe, expect, it } from "vitest";

import { bibToYaml } from "../../src/lib/publications/bibToYaml";
import { parsePublicationsYaml, publicationForPage } from "../../src/lib/publications/loadPublications";
import { displayName, splitBibtexNames, surname } from "../../src/lib/publications/names";
import { parseBibtex } from "../../src/lib/publications/parseBibtex";

describe("BibTeX names", () => {
  it("splits on top-level `and` only", () => {
    expect(splitBibtexNames("Altabaa, Awni and Webb, Taylor W.")).toEqual(["Altabaa, Awni", "Webb, Taylor W."]);
    expect(splitBibtexNames("{Barnes and Noble} and Ada Lovelace")).toEqual(["{Barnes and Noble}", "Ada Lovelace"]);
    expect(splitBibtexNames("Anderson, Ann and Sandra Andrews")).toEqual(["Anderson, Ann", "Sandra Andrews"]);
  });

  it("puts every BibTeX name form in reading order and decodes LaTeX", () => {
    expect(displayName("Altabaa, Awni")).toBe("Awni Altabaa");
    expect(displayName('Y{\\"u}ksel, Serdar')).toBe("Serdar Yüksel");
    expect(displayName("van der Berg, Jan")).toBe("Jan van der Berg");
    expect(displayName("King, Jr., Martin Luther")).toBe("Martin Luther King, Jr.");
    expect(displayName("Taylor W. Webb")).toBe("Taylor W. Webb");
    expect(displayName("{Barnes and Noble}")).toBe("Barnes and Noble");
  });

  it("finds the surname in either form", () => {
    expect(surname("Webb, Taylor W.")).toBe("Webb");
    expect(surname("Taylor W. Webb")).toBe("Webb");
    expect(surname('Y{\\"u}ksel, Serdar')).toBe("Yüksel");
    expect(surname("van der Berg, Jan")).toBe("van der Berg");
  });

  it("shows .bib authors in reading order on the publications list", () => {
    const [entry] = parseBibtex(`@article{a, title = {T}, year = 2023, journal = {J},
      author = {Altabaa, Awni and Yongacoglu, Bora and Y{\\"u}ksel, Serdar}}`);
    expect(entry.authors).toEqual(["Awni Altabaa", "Bora Yongacoglu", "Serdar Yüksel"]);
    expect(entry.author).toBe("Awni Altabaa, Bora Yongacoglu, Serdar Yüksel");
  });
});

const good = `
- id: altabaa2023decentralizedmarl
  title: Decentralized Multi-Agent Reinforcement Learning for Continuous-Space Stochastic Games
  authors: [Awni Altabaa, Bora Yongacoglu, Serdar Yüksel]
  year: 2023
  venue: IEEE American Control Conference (ACC)
  award: Best Paper
  selected: true
  preview: marl.webp
  publisher_label: IEEE
  links:
    arxiv: "2303.13539"
    blog: /blog/decentralized-marl
    publisher: https://ieeexplore.ieee.org/document/10155828
  bibtex: |
    @inproceedings{altabaa2023decentralizedmarl,
      author = {Altabaa, Awni and Yongacoglu, Bora and Y{\\"u}ksel, Serdar},
      title = {Decentralized Multi-Agent Reinforcement Learning for Continuous-Space Stochastic Games},
      booktitle = {2023 American Control Conference (ACC)},
      year = {2023},
      eprint = {2303.13539},
      archivePrefix = {arXiv},
      primaryClass = {cs.LG}
    }
`;

describe("parsePublicationsYaml", () => {
  it("reads display fields as written and keeps the citation verbatim", () => {
    const { publications, issues } = parsePublicationsYaml(good);
    expect(issues).toEqual([]);
    const [publication] = publications;
    expect(publication).toMatchObject({
      id: "altabaa2023decentralizedmarl",
      type: "inproceedings",
      authors: ["Awni Altabaa", "Bora Yongacoglu", "Serdar Yüksel"],
      author: "Awni Altabaa, Bora Yongacoglu, Serdar Yüksel",
      year: "2023",
      venue: "IEEE American Control Conference (ACC)",
      award: "Best Paper",
      selected: true,
      arxiv: "2303.13539",
      publisherPage: "https://ieeexplore.ieee.org/document/10155828",
      bibtexShow: true
    });
    expect(publication.preview).toMatch(/\/marl\.webp$/);
    expect(publication.fields.publisher_label).toBe("IEEE");
    expect(publication.fields.eprint).toBe("2303.13539");
    expect(publication.bibtex).toContain('Y{\\"u}ksel, Serdar');
    expect(publication.bibtex.startsWith("@inproceedings{altabaa2023decentralizedmarl,")).toBe(true);
  });

  it("finds the publication that links to a page, by route or short URL", () => {
    const { publications } = parsePublicationsYaml(good);
    expect(publicationForPage(publications, ["/blog/decentralized-marl/"])?.id).toBe("altabaa2023decentralizedmarl");
    expect(publicationForPage(publications, ["/blog/other", "blog/decentralized-marl"])?.id).toBe(
      "altabaa2023decentralizedmarl"
    );
    expect(publicationForPage(publications, ["/blog/other", undefined])).toBeUndefined();
  });

  it("reports a citation that disagrees with its entry, and keeps the entry", () => {
    const drifted = good
      .replace("altabaa2023decentralizedmarl,", "altabaa2023marl,")
      .replace("year = {2023}", "year = {2022}")
      .replace("Yongacoglu, Bora and ", "")
      .replace("booktitle = {2023 American Control Conference (ACC)}", "booktitle = {ACC, spotlight}")
      .replace("primaryClass = {cs.LG}", "primaryClass = {cs, stat}");
    const { publications, issues } = parsePublicationsYaml(drifted);
    expect(publications).toHaveLength(1);
    expect(issues.every((issue) => !issue.skipped)).toBe(true);
    const messages = issues.map((issue) => issue.message).join("\n");
    expect(messages).toMatch(/key "altabaa2023marl" should be the entry's id/);
    expect(messages).toMatch(/year \(2022\) differs/);
    expect(messages).toMatch(/lists 2 authors; "authors" lists 3/);
    expect(messages).toMatch(/booktitle contains "spotlight"/);
    expect(messages).toMatch(/primaryClass "cs, stat"/);
  });

  it("checks the fields an entry type requires and the surnames in order", () => {
    const { issues } = parsePublicationsYaml(`
- id: a
  title: T
  authors: [Ada Lovelace, Charles Babbage]
  year: 2020
  bibtex: "@article{a, author = {Babbage, Charles and Lovelace, Ada}, title = {T}, year = {2020}}"
`);
    const messages = issues.map((issue) => issue.message);
    expect(messages).toContain('An @article entry needs a "journal" field.');
    expect(messages.some((message) => /author 1, surname "Babbage"/.test(message))).toBe(true);
  });

  it("skips an entry it cannot read, naming the problem", () => {
    const { publications, issues } = parsePublicationsYaml(`
- id: a
  title: T
  authors: [A]
  year: 2020
  jornal: Oops
- id: b
  title: T
  authors: [A]
  links: { slides: x.pdf, sildes: y.pdf }
- id: c
  title: Undated
  authors: [A]
`);
    expect(publications.map((publication) => [publication.id, publication.year])).toEqual([["c", "n.d."]]);
    expect(issues).toEqual([
      { entry: "a", message: 'Unknown field "jornal".', skipped: true },
      { entry: "b", message: expect.stringMatching(/^Unknown link "sildes"/), skipped: true }
    ]);
  });

  it("treats an empty file as no publications", () => {
    expect(parsePublicationsYaml("# nothing yet\n")).toEqual({ publications: [], issues: [] });
  });
});

describe("bibToYaml", () => {
  it("converts a .bib entry into display fields and a citation that passes the checks", () => {
    const text = bibToYaml(`@inproceedings{altabaa2024abstractors,
      title = {Abstractors},
      author = {Altabaa, Awni and Y{\\"u}ksel, Serdar},
      booktitle = {International Conference on Learning Representations (ICLR)},
      year = {2024},
      selected = {true},
      bibtex_show = {true},
      arxiv = {2304.00195},
      publisher_page = {https://openreview.net/forum?id=XNa6r6ZjoB},
      preview = {abstractor.webp}
    }
    @misc{hidden, title = {Hidden}, author = {Doe, Jane}, year = {2020}}`);
    const { publications, issues } = parsePublicationsYaml(text);
    expect(issues).toEqual([]);
    expect(publications[0]).toMatchObject({
      authors: ["Awni Altabaa", "Serdar Yüksel"],
      venue: "International Conference on Learning Representations (ICLR)",
      selected: true,
      arxiv: "2304.00195",
      publisherPage: "https://openreview.net/forum?id=XNa6r6ZjoB"
    });
    expect(publications[0].bibtex).toContain("booktitle = {International Conference on Learning Representations (ICLR)}");
    expect(publications[0].bibtex).not.toContain("preview");
    expect(publications[1]).toMatchObject({ id: "hidden", bibtexShow: false });
  });
});
