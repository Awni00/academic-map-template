import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EntryRow from "../../src/components/graph/browser/EntryRow";
import NodeDetailPanel from "../../src/components/graph/NodeDetailPanel";
import { writingConfig } from "../../src/config";
import { buildGraphIndex } from "../../src/lib/graph/buildGraph";
import type { WritingEntryLike } from "../../src/lib/graph/types";

const entries: WritingEntryLike[] = [
  {
    id: "papers/full",
    body: "",
    data: { title: "Full Paper", type: "paper", summary: "Paper", tags: [], links: [] }
  },
  {
    id: "papers/record",
    body: "",
    data: { title: "Paper Record", type: "paper", summary: "Paper", tags: [], links: [], article: { mode: "abstract" } }
  }
];

function nodes() {
  const { index } = buildGraphIndex(entries);
  const byId = new Map(index.nodes.map((node) => [node.id, node]));
  return { full: byId.get("papers/full")!, record: byId.get("papers/record")! };
}

// A full page is the default and goes unmarked; only an abstract-only page is
// tagged, so a reader can tell before opening it that it is just the abstract.
describe("abstract-only tagging", () => {
  it("carries each page's resolved article mode on its graph node", () => {
    const { full, record } = nodes();
    expect(full.mode).toBe("article");
    expect(record.mode).toBe("abstract");
  });

  it("tags an abstract-only page in the panel and its open action", () => {
    const html = renderToString(createElement(NodeDetailPanel, { node: nodes().record }));
    expect(html).toContain(">Abstract<");
    expect(html).toContain(writingConfig.nodePanel.openLabel.abstract);
    expect(html).not.toContain(writingConfig.nodePanel.openLabel.article);
  });

  it("leaves a full page's panel as it was", () => {
    const html = renderToString(createElement(NodeDetailPanel, { node: nodes().full }));
    expect(html).not.toContain(">Abstract<");
    expect(html).toContain(writingConfig.nodePanel.openLabel.article);
  });

  it("tags only the abstract-only row in List and Topics", () => {
    const { full, record } = nodes();
    const row = (entry: typeof full) => renderToString(createElement(EntryRow, { entry, density: "comfortable" }));
    expect(row(record)).toContain("wb-row__mode");
    expect(row(full)).not.toContain("wb-row__mode");
  });
});
