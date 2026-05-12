import { describe, expect, it } from "vitest";

import { buildGraphIndex } from "../../src/lib/graph/buildGraph";
import { extractWikilinks, normalizeKey, slugForEntry } from "../../src/lib/graph/resolveLinks";
import { graphNeighborhood } from "../../src/lib/graph/neighborhoods";
import type { WritingEntryLike } from "../../src/lib/graph/types";
import { searchWriting, toSearchDocuments } from "../../src/lib/search/writingSearch";

const entries: WritingEntryLike[] = [
  {
    id: "hubs/ml-theory",
    body: "See [[paper-one|the paper]].",
    data: {
      title: "Machine Learning Theory",
      type: "hub",
      aliases: ["ML theory"],
      summary: "Hub",
      tags: ["theory"],
      links: ["note-one"]
    }
  },
  {
    id: "papers/paper-one",
    body: "[[ML theory]] and [normal](/writing/note-one)",
    data: {
      title: "Paper One",
      type: "paper",
      summary: "Paper",
      tags: ["paper"],
      links: []
    }
  },
  {
    id: "notes/note-one",
    body: "No links.",
    data: {
      title: "Note One",
      type: "note",
      summary: "Note",
      tags: ["note"],
      links: []
    }
  }
];

describe("graph utilities", () => {
  it("normalizes keys and flattened slugs", () => {
    expect(normalizeKey(" Machine Learning Theory! ")).toBe("machine-learning-theory");
    expect(slugForEntry(entries[0])).toBe("ml-theory");
  });

  it("extracts wikilinks with labels", () => {
    expect(extractWikilinks("[[ml-theory|ML theory]]")).toEqual([
      { raw: "[[ml-theory|ML theory]]", target: "ml-theory", label: "ML theory" }
    ]);
  });

  it("builds edges only from frontmatter links and wikilinks", () => {
    const { index } = buildGraphIndex(entries);
    expect(index.edges).toContainEqual({ source: "ml-theory", target: "note-one" });
    expect(index.edges).toContainEqual({ source: "ml-theory", target: "paper-one" });
    expect(index.edges).toContainEqual({ source: "paper-one", target: "ml-theory" });
    expect(index.edges).not.toContainEqual({ source: "paper-one", target: "note-one" });
  });

  it("derives backlinks and neighborhoods", () => {
    const { index } = buildGraphIndex(entries);
    expect(index.backlinks["ml-theory"]).toEqual(["paper-one"]);
    expect(graphNeighborhood(index, "ml-theory", 1).nodes.map((node) => node.id).sort()).toEqual([
      "ml-theory",
      "note-one",
      "paper-one"
    ]);
  });

  it("filters search documents by query and type", () => {
    const { index } = buildGraphIndex(entries);
    const docs = toSearchDocuments(index.nodes);
    expect(searchWriting(docs, { query: "paper", types: ["paper"] }).map((doc) => doc.id)).toEqual(["paper-one"]);
  });
});
