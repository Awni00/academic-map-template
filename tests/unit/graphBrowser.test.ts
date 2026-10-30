import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GraphBrowser from "../../src/components/graph/GraphBrowser";
import { writingConfig } from "../../src/config/writing";
import { browserLabels } from "../../src/lib/graph/browserLabels";
import { buildGraphIndex } from "../../src/lib/graph/buildGraph";
import type { WritingEntryLike } from "../../src/lib/graph/types";

const entries: WritingEntryLike[] = [
  {
    id: "learning/index",
    body: "[[./paper-one]]",
    data: { title: "Learning", type: "hub", summary: "Learning hub", tags: [], links: [] }
  },
  {
    id: "systems/index",
    body: "",
    data: { title: "Systems", type: "hub", summary: "Systems hub", tags: [], links: [] }
  },
  {
    id: "learning/paper-one",
    body: "",
    data: { title: "Paper One", type: "paper", summary: "Paper", tags: [], links: [] }
  }
];

describe("GraphBrowser initial state", () => {
  // The server render is the first thing a reader sees and what hydration has
  // to match, so it is where a default selection would show up first. The
  // canvas cannot mark anything until the reader picks it, so the panel must
  // not describe anything either.
  it("opens the map with nothing selected", () => {
    const { index } = buildGraphIndex(entries);
    const html = renderToString(createElement(GraphBrowser, { graph: index }));

    expect(html).toContain("Select a node on the map");
    expect(html).not.toContain("preview-title");
    expect(html).not.toContain("Open page");
  });

  it("lists every hub as a way into the map", () => {
    const { index } = buildGraphIndex(entries);
    const html = renderToString(createElement(GraphBrowser, { graph: index }));

    expect(html).toMatch(/Hubs.*>2</s);
    expect(html).toContain(">Learning<");
    expect(html).toContain(">Systems<");
    expect(html).not.toContain(">Paper One<");
  });
});

describe("GraphBrowser labels", () => {
  it("names the browser after writing.label rather than a fixed word", () => {
    const { index } = buildGraphIndex(entries);
    const html = renderToString(createElement(GraphBrowser, { graph: index }));
    const { heading, all } = browserLabels();

    expect(heading).toBe(writingConfig.label);
    expect(html).toContain(`>${heading}</span>`);
    expect(html).toContain(`<span class="crumb">${all}</span>`);
    expect(html).toContain(`aria-label="${heading} browser"`);
  });

  it("derives the breadcrumb from the label unless the site sets one", () => {
    const base = { label: "Blog", browser: { ...writingConfig.browser, labels: {} } };
    expect(browserLabels(base)).toEqual({ heading: "Blog", all: "All blog" });
    expect(
      browserLabels({ ...base, browser: { ...base.browser, labels: { all: "All posts" } } }).all
    ).toBe("All posts");
  });
});
