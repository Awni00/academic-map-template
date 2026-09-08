import { describe, expect, it } from "vitest";

import { buildGraphIndex } from "../../src/lib/graph/buildGraph";
import {
  canonicalizeWritingPath,
  extractWikilinks,
  normalizeKey,
  referencePath,
  slugForEntry
} from "../../src/lib/graph/resolveLinks";
import { graphNeighborhood } from "../../src/lib/graph/neighborhoods";
import type { WritingEntryLike } from "../../src/lib/graph/types";
import { searchWriting, toSearchDocuments } from "../../src/lib/search/writingSearch";

const entries: WritingEntryLike[] = [
  {
    id: "learning/index",
    body: "See [[./paper-one|the paper]].",
    data: {
      title: "Learning",
      type: "hub",
      aliases: ["learning hub"],
      summary: "Hub",
      tags: ["theory"],
      links: ["./note-one"]
    }
  },
  {
    id: "learning/paper-one",
    body: "[[learning]] and [[./note-one]] and [[learning hub]] and [normal](/writing/learning/note-one)",
    data: {
      title: "Paper One",
      type: "paper",
      summary: "Paper",
      tags: ["paper"],
      links: []
    }
  },
  {
    id: "learning/note-one",
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
  it("normalizes keys and canonical paths", () => {
    expect(normalizeKey(" Hub 1! ")).toBe("hub-1");
    expect(canonicalizeWritingPath("Hub 4/Hub 5/index.mdx")).toBe("hub-4/hub-5");
    expect(canonicalizeWritingPath("foo.mdx")).toBe("foo");
    expect(slugForEntry(entries[0])).toBe("learning");
    expect(referencePath("./note-one", "learning")).toBe("learning/note-one");
  });

  it("extracts wikilinks with labels", () => {
    expect(extractWikilinks("[[ml-theory|ML theory]]")).toEqual([
      { raw: "[[ml-theory|ML theory]]", target: "ml-theory", label: "ML theory" }
    ]);
  });

  it("builds edges only from frontmatter links and wikilinks", () => {
    const { index } = buildGraphIndex(entries);
    expect(index.nodes.map((node) => node.id).sort()).toEqual(["learning", "learning/note-one", "learning/paper-one"]);
    expect(index.edges).toContainEqual({ source: "learning", target: "learning/note-one" });
    expect(index.edges).toContainEqual({ source: "learning", target: "learning/paper-one" });
    expect(index.edges).toContainEqual({ source: "learning/paper-one", target: "learning" });
    expect(index.edges).toContainEqual({ source: "learning/paper-one", target: "learning/note-one" });
  });

  it("derives linkedFrom and neighborhoods", () => {
    const { index } = buildGraphIndex(entries);
    expect(index.linkedFrom["learning"]).toEqual(["learning/paper-one"]);
    expect(graphNeighborhood(index, "learning", 1).nodes.map((node) => node.id).sort()).toEqual([
      "learning",
      "learning/note-one",
      "learning/paper-one"
    ]);
  });

  it("keeps the centre when maxNodes trims the neighborhood", () => {
    const hub: WritingEntryLike = {
      id: "wide/index",
      body: "",
      data: { title: "Wide", type: "hub", summary: "Hub", tags: [], links: [] }
    };
    // Every leaf links to the hub, and each sorts before it by id, so an
    // order-preserving trim would drop the hub itself.
    const leaves: WritingEntryLike[] = Array.from({ length: 8 }, (_, index) => ({
      id: `aaa/leaf-${index}`,
      body: "[[wide]]",
      data: { title: `Leaf ${index}`, type: "note", summary: "Leaf", tags: [] }
    }));
    const { index } = buildGraphIndex([...leaves, hub]);
    const neighborhood = graphNeighborhood(index, "wide", 1, 4);
    expect(neighborhood.nodes).toHaveLength(4);
    expect(neighborhood.nodes.map((node) => node.id)).toContain("wide");
  });

  it("keeps sub-hubs out of top-level hub topics", () => {
    const { index } = buildGraphIndex([
      {
        id: "hub-4/index",
        body: "",
        data: { title: "Hub 4", type: "hub", summary: "Hub", tags: [], links: ["./hub-5"] }
      },
      {
        id: "hub-4/hub-5/index",
        body: "",
        data: {
          title: "Hub 5",
          type: "sub-hub",
          summary: "Sub-hub",
          tags: [],
          links: []
        }
      }
    ]);
    expect(index.nodes.find((node) => node.id === "hub-4/hub-5")?.type).toBe("sub-hub");
    expect(index.hubs.map((node) => node.id)).toEqual(["hub-4"]);
  });

  it("filters search documents by query and type", () => {
    const { index } = buildGraphIndex(entries);
    const docs = toSearchDocuments(index.nodes);
    expect(searchWriting(docs, { query: "paper", types: ["paper"] }).map((doc) => doc.id)).toEqual([
      "learning/paper-one"
    ]);
  });

  it("does not resolve bare basenames outside top-level paths or aliases", () => {
    const { index, warnings } = buildGraphIndex([
      ...entries,
      {
        id: "other/note-one",
        body: "[[note-one]]",
        data: {
          title: "Other Note One",
          type: "note",
          summary: "Other note",
          tags: [],
          links: []
        }
      }
    ]);
    expect(index.edges).not.toContainEqual({ source: "other/note-one", target: "learning/note-one" });
    expect(warnings.some((warning) => warning.type === "unresolved-wikilink" && warning.target === "note-one")).toBe(
      true
    );
  });

  it("flags ambiguous aliases", () => {
    const { warnings } = buildGraphIndex([
      {
        id: "a/index",
        body: "",
        data: { title: "A", type: "hub", aliases: ["Shared"], summary: "A", tags: [], links: [] }
      },
      {
        id: "b/index",
        body: "",
        data: { title: "B", type: "hub", aliases: ["shared"], summary: "B", tags: [], links: [] }
      }
    ]);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        type: "duplicate-alias",
        target: "shared"
      })
    );
  });

  it("uses filePath to resolve relative links from Astro index entries", () => {
    const { index } = buildGraphIndex([
      {
        id: "learning",
        filePath: "src/content/writing/learning/index.mdx",
        body: "[[./note-one]]",
        data: {
          title: "Learning",
          type: "hub",
          summary: "Hub",
          tags: [],
          links: ["./note-one"]
        }
      },
      {
        id: "learning/note-one",
        filePath: "src/content/writing/learning/note-one.mdx",
        body: "",
        data: {
          title: "Note One",
          type: "note",
          summary: "Note",
          tags: [],
          links: []
        }
      }
    ]);
    expect(index.edges).toContainEqual({ source: "learning", target: "learning/note-one" });
  });
});
