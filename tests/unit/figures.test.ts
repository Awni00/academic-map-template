import * as Plot from "@observablehq/plot";
import { describe, expect, it } from "vitest";

import {
  DASH,
  FIGURE_COMPACT_WIDTH,
  NEUTRAL,
  SERIES,
  SERIES_ALT,
  colorToken,
  replaceColorSentinels,
  withSiteDefaults
} from "../../src/lib/figures";
import { canvas, showsReplay } from "../../src/lib/figures/diagram";
import { writingConfig } from "../../src/config/writing";
import { escapeHtml, unescapeHtml } from "../../src/lib/figures/escape";
import { figureLayout, findDefinition } from "../../src/lib/figures/frame";
import { renderLegend } from "../../src/lib/figures/legend";
import { niceTicks, tickFormat } from "../../src/lib/figures/panels";
import { parseFigureData, renderFigure } from "../../src/lib/figures/render";
import { hasTex, texToHtml, texToPlain } from "../../src/lib/figures/tex";

/** Every `M`/`L`/`Q`/`C` coordinate pair in an SVG path, in order. */
const pathPoints = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }));

const paths = (svg: string, className: string) =>
  [...svg.matchAll(new RegExp(`<path d="([^"]+)" class="${className}[^"]*"`, "g"))].map((m) => m[1]);

describe("colour sentinels", () => {
  it("swaps every series, companion and neutral sentinel for its theme variable", () => {
    const html = `<path stroke="${SERIES[0]}" fill="${SERIES_ALT[5]}"></path><circle fill="${NEUTRAL}"></circle>`;
    expect(replaceColorSentinels(html)).toBe(
      '<path stroke="var(--figure-1)" fill="var(--figure-6-alt)"></path><circle fill="var(--figure-neutral)"></circle>'
    );
  });

  it("leaves other colours alone", () => {
    expect(replaceColorSentinels('<rect fill="#123456"></rect>')).toBe('<rect fill="#123456"></rect>');
    expect(colorToken("#123456")).toBe("#123456");
    expect(colorToken(SERIES[2])).toBe("var(--figure-3)");
  });

  it("keeps every sentinel distinct", () => {
    const all = [...SERIES, ...SERIES_ALT, NEUTRAL];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("withSiteDefaults", () => {
  it("centres x and y labels without arrows, and widens the margins to fit them", () => {
    const options = withSiteDefaults({ x: { label: "Step" }, y: { label: "Loss" }, marks: [] });
    expect(options.x).toMatchObject({ label: "Step", labelAnchor: "center", labelArrow: "none" });
    expect(options.y).toMatchObject({ label: "Loss", labelAnchor: "center", labelArrow: "none" });
    expect(options.marginLeft).toBe(40 + 14);
    expect(options.marginBottom).toBe(44);
    expect(options.className).toBe("figure-plot");
    expect(withSiteDefaults({ className: "mine" }).className).toBe("figure-plot mine");
  });

  it("widens a margin the definition set, rather than replacing it", () => {
    const options = withSiteDefaults({ marginLeft: 60, marginBottom: 50, x: { label: "x" }, y: { label: "y" } });
    expect(options.marginLeft).toBe(74);
    expect(options.marginBottom).toBe(50);
  });

  it("leaves margins alone with no label, a hidden axis, or a label anchored elsewhere", () => {
    expect(withSiteDefaults({}).marginLeft).toBeUndefined();
    expect(withSiteDefaults({ y: { label: "Loss", axis: null } }).marginLeft).toBeUndefined();
    const top = withSiteDefaults({ y: { label: "Loss", labelAnchor: "top" } });
    expect(top.marginLeft).toBeUndefined();
    expect(top.y).toMatchObject({ labelAnchor: "top" });
  });

  it("drops label arrows on facet axes too, without centring them", () => {
    const options = withSiteDefaults({ fx: { label: "Panel" } });
    expect(options.fx).toMatchObject({ labelArrow: "none" });
    expect(options.fx).not.toHaveProperty("labelAnchor");
  });
});

describe("renderFigure", () => {
  const data = parseFigureData("step,loss\n0,1\n1,0.5\n2,0.25\n");

  it("parses CSV with typed fields", () => {
    expect(data[1]).toEqual({ step: 1, loss: 0.5 });
  });

  it("renders inline SVG with theme variables and plain-text alt", () => {
    const svg = renderFigure(
      { width: 360, marks: [Plot.lineY(data, { x: "step", y: "loss", stroke: SERIES[1] })] },
      "Loss for $\\alpha = 1$"
    );
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('class="figure-plot"');
    expect(svg).toContain("var(--figure-2)");
    expect(svg).not.toContain(SERIES[1]);
    expect(svg).toContain('aria-label="Loss for \\alpha = 1"');
  });

  it("sets an axis label with TeX in KaTeX, and leaves a plain one as SVG text", () => {
    const svg = renderFigure(
      {
        width: 360,
        x: { label: "Step" },
        y: { label: "Rate $\\eta_t$" },
        marks: [Plot.lineY(data, { x: "step", y: "loss" })]
      },
      "Chart"
    );
    const y = /aria-label="y-axis label"[^>]*>(.*?)<\/g>/s.exec(svg)?.[1] ?? "";
    expect(y).toContain('<foreignObject class="figure-tex"');
    expect(y).toContain('class="katex"');
    expect(y).toContain("Rate ");
    expect(y).not.toContain("$");
    const x = /aria-label="x-axis label"[^>]*>(.*?)<\/g>/s.exec(svg)?.[1] ?? "";
    expect(x).toContain(">Step</text>");
    expect(x).not.toContain("foreignObject");
  });
});

describe("TeX in labels", () => {
  it("finds, renders and strips inline math", () => {
    expect(hasTex("plain")).toBe(false);
    // A dollar amount is not math.
    expect(hasTex("costs $5 to $10")).toBe(false);
    expect(texToHtml("costs $5 to $10")).toBe("costs $5 to $10");
    expect(hasTex("$x$")).toBe(true);
    expect(texToPlain("Loss $\\mathcal{L}$")).toBe("Loss \\mathcal{L}");
    const html = texToHtml("At $N=128$ <best>");
    expect(html).toContain('class="katex"');
    expect(html).toContain("At ");
    expect(html).toContain("&lt;best&gt;");
  });

  it("does not throw on bad TeX", () => {
    expect(() => texToHtml("$\\frac{$")).not.toThrow();
  });
});

describe("escaping", () => {
  it("escapes text for content and attributes, and round-trips", () => {
    const text = `<a href="x">Tom & Jerry's</a>`;
    expect(escapeHtml(text)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
    expect(unescapeHtml(escapeHtml(text))).toBe(text);
  });
});

describe("diagram canvas", () => {
  it("trims an edge at both nodes' outlines and puts the arrowhead's tip on the second", () => {
    const c = canvas(200, 100);
    const mid = c.edge({ x: 20, y: 50, r: 10 }, { x: 180, y: 50, r: 10 });
    const svg = c.toSvg("Edge");
    const [line] = paths(svg, "d-line");
    const [head] = paths(svg, "d-head");
    // The line starts r + gap (1.5) outside the first node.
    expect(pathPoints(line)[0]).toEqual({ x: 31.5, y: 50 });
    // The tip touches the second node's outline plus the gap; the line stops
    // short of it, under the head.
    expect(pathPoints(head)[0]).toEqual({ x: 168.5, y: 50 });
    expect(pathPoints(line).at(-1)!.x).toBeLessThan(168.5);
    expect(mid).toEqual({ x: 100, y: 50 });
  });

  it("bends an edge to the left of travel", () => {
    const c = canvas(200, 100);
    // Travelling +x in SVG's y-down frame, left is -y.
    const mid = c.edge({ x: 20, y: 50, r: 10 }, { x: 180, y: 50, r: 10 }, { bend: 30 });
    expect(mid.y).toBeLessThan(50);
    expect(paths(c.toSvg("Bent"), "d-line")[0]).toContain("Q");
  });

  it("draws a self-loop as a cubic that leaves and returns at the node's outline", () => {
    const node = { x: 100, y: 100, r: 20 };
    const c = canvas(200, 200);
    const labelAt = c.loop(node, -90);
    const svg = c.toSvg("Loop");
    const [line] = paths(svg, "d-line");
    const [head] = paths(svg, "d-head");
    expect(line).toContain("C");
    const distance = (p: { x: number; y: number }) => Math.hypot(p.x - node.x, p.y - node.y);
    expect(distance(pathPoints(line)[0])).toBeCloseTo(node.r + 1.5, 1);
    expect(distance(pathPoints(head)[0])).toBeCloseTo(node.r + 1.5, 1);
    // The label point sits above the node, past the loop's apex.
    expect(labelAt.y).toBeLessThan(node.y - node.r * 2);
    expect(labelAt.x).toBeCloseTo(node.x, 0);
  });

  it("draws arrowheads at the ends asked for", () => {
    const heads = (head: "end" | "start" | "both" | "none") => {
      const c = canvas(100, 20).arrow({ x: 10, y: 10 }, { x: 90, y: 10 }, { head });
      return paths(c.toSvg("Arrow"), "d-head").map((d) => pathPoints(d)[0].x);
    };
    expect(heads("end")).toEqual([90]);
    expect(heads("start")).toEqual([10]);
    expect(heads("both").sort((a, b) => a - b)).toEqual([10, 90]);
    expect(heads("none")).toEqual([]);
    // A 7px head, 6.5px wide.
    const [d] = paths(canvas(100, 20).arrow({ x: 10, y: 10 }, { x: 90, y: 10 }).toSvg("A"), "d-head");
    expect(pathPoints(d)).toEqual([
      { x: 90, y: 10 },
      { x: 83, y: 13.25 },
      { x: 83, y: 6.75 }
    ]);
  });

  it("escapes label text and alt text", () => {
    const svg = canvas(100, 40).label({ x: 50, y: 20 }, `<b> & "q"`).toSvg(`A "quoted" <alt>`);
    expect(svg).toContain(">&lt;b&gt; &amp; &quot;q&quot;</text>");
    expect(svg).toContain('aria-label="A &quot;quoted&quot; &lt;alt&gt;"');
    expect(svg).not.toContain("<b>");
  });

  it("sets a TeX label in a foreignObject and a strong fill without an outline", () => {
    const svg = canvas(200, 100)
      .rect(10, 10, 80, 40, { tone: 2, fill: "strong" })
      .label({ x: 50, y: 30 }, "$f_\\theta$", { tone: "inverse" })
      .toSvg("Block");
    expect(svg).toMatch(/class="d-region d-tone-2 d-fill-strong"/);
    expect(svg).toContain('<foreignObject x="-190" y="10"');
    expect(svg).toContain("d-tone-inverse");
    expect(svg).toContain('class="katex"');
  });
});

describe("legend", () => {
  it("draws nothing for no items", () => {
    expect(renderLegend([])).toBe("");
  });

  it("draws line, dashed line, swatch, dot, region and arrow keys in theme colours", () => {
    const html = renderLegend([
      { label: "Model", color: SERIES[0], key: "line" },
      { label: "Variant", color: SERIES_ALT[0], key: "line", dashed: true },
      { label: "Dotted", color: SERIES[1], key: "line", dashed: "1.5,3" },
      { label: "Bars", color: SERIES[2], key: "swatch" },
      { label: "Points", color: SERIES[3], key: "dot" },
      { label: "Set", color: SERIES[4], key: "region" },
      { label: "Flow", color: NEUTRAL, key: "arrow" }
    ]);
    expect(html).toMatch(/^<ul class="figure-legend" aria-hidden="true">/);
    expect(html.match(/<li>/g)).toHaveLength(7);
    expect(html).toContain('stroke="var(--figure-1)" stroke-width="2"></line>');
    expect(html).toContain(`stroke="var(--figure-1-alt)" stroke-width="2" stroke-dasharray="${DASH}"`);
    expect(html).toContain('stroke-dasharray="1.5,3"');
    expect(html).toContain('<rect x="3" y="0" width="10" height="10" rx="1.5" fill="var(--figure-3)">');
    expect(html).toContain('<circle cx="8" cy="5" r="4" fill="var(--figure-4)">');
    expect(html).toContain('style="--tone: var(--figure-5)"><rect x="3.5" y="0.5" width="9" height="9" rx="1.5" class="figure-legend__region">');
    expect(html).toContain('<path d="M16,5L9,1.75L9,8.25Z" fill="var(--figure-neutral)">');
  });

  it("keeps a label with math in one element", () => {
    const html = renderLegend([{ label: "Best (99% at $N=128$)", color: SERIES[0], key: "line" }]);
    const label = /<span class="figure-legend__label">(.*)<\/span><\/li>/s.exec(html)?.[1] ?? "";
    expect(label.startsWith("Best (99% at ")).toBe(true);
    expect(label).toContain('class="katex"');
    expect(label.endsWith(")")).toBe(true);
  });

  it("draws a ramp key with one step per opacity and escaped end labels", () => {
    const html = renderLegend([
      { key: "ramp", label: "Depth", color: SERIES[0], opacities: [0.2, 0.6, 1], from: "<1", to: "10" }
    ]);
    expect(html).toContain('class="figure-legend__ramp"');
    expect(html.match(/fill-opacity=/g)).toHaveLength(3);
    expect(html).toContain('<svg width="36" height="10" viewBox="0 0 36 10">');
    expect(html).toContain("<span>&lt;1</span>");
  });
});

describe("figure frame", () => {
  it("finds a definition by id, or names the missing file", () => {
    const modules = { "/src/site/figures/post/a.ts": { default: { id: "a" } } };
    expect(findDefinition(modules, "src/site/figures", "post/a", "Chart")).toEqual({ id: "a" });
    expect(() => findDefinition(modules, "src/site/figures", "post/b", "Chart")).toThrow(
      "<Chart>: no definition at src/site/figures/post/b.ts"
    );
  });

  it("gives medium and full figures a phone layout, and narrow ones none", () => {
    expect(figureLayout("narrow")).toEqual({ size: "narrow", width: 360, compactWidth: null });
    expect(figureLayout("medium")).toEqual({ size: "medium", width: 560, compactWidth: FIGURE_COMPACT_WIDTH });
    expect(figureLayout("full").width).toBe(760);
  });
});

describe("panel ticks", () => {
  it("picks round ticks and a matching precision", () => {
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(0, 7, 3)).toEqual([0, 2.5, 5]);
    expect(tickFormat([0, 0.25, 0.5])(0.5)).toBe("0.50");
    expect(tickFormat([0, 5, 10])(5)).toBe("5");
  });
});

describe("diagram replay", () => {
  it("never shows for a diagram that does not animate", () => {
    expect(showsReplay(undefined, true, true)).toBe(false);
  });

  it("takes the prop, then the definition, then the site default", () => {
    // Site default alone.
    expect(showsReplay({}, undefined, true)).toBe(true);
    expect(showsReplay({}, undefined, false)).toBe(false);
    // The definition overrides the site.
    expect(showsReplay({ replay: false }, undefined, true)).toBe(false);
    expect(showsReplay({ replay: true }, undefined, false)).toBe(true);
    // The prop overrides both.
    expect(showsReplay({ replay: false }, true, false)).toBe(true);
    expect(showsReplay({ replay: true }, false, true)).toBe(false);
  });

  it("is on by default site-wide", () => {
    expect(writingConfig.entryLayout.diagramReplay).toBe(true);
  });
});

describe("TeX label boxes", () => {
  // A TeX label's foreignObject is far larger than its text, and used to
  // catch the pointer over controls and marks drawn beneath it, including
  // those of a neighbouring figure: the SVG has overflow: visible, so the box
  // can reach into the next cell of a FigureGrid. The rule therefore has to
  // be on the foreignObject itself, not on an ancestor that clips or scopes.
  const foreignObjects = (svg: string) => [...svg.matchAll(/<foreignObject[^>]*>/g)].map((m) => m[0]);

  it("lets the pointer through a diagram's TeX labels", () => {
    const svg = canvas(200, 100)
      .label({ x: 50, y: 30 }, "$x$")
      .label({ x: 150, y: 30 }, "Input $\\hat{y}$", { halo: true })
      .toSvg("Labels");
    const boxes = foreignObjects(svg);
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box).toContain('pointer-events="none"');
  });

  it("keeps the rule on a label box that reaches past its own canvas", () => {
    // A label near the right edge of a narrow canvas: its 480px box spills
    // well past the 200px SVG, where a neighbouring figure would sit.
    const svg = canvas(200, 60).label({ x: 190, y: 30 }, "$h^{(t+1)}$").toSvg("Edge label");
    const [box] = foreignObjects(svg);
    const x = Number(/ x="([-\d.]+)"/.exec(box)![1]);
    const width = Number(/ width="([\d.]+)"/.exec(box)![1]);
    expect(x + width).toBeGreaterThan(200);
    expect(box).toMatch(/^<foreignObject [^>]*pointer-events="none"/);
  });

  it("lets the pointer through a chart's TeX axis labels", () => {
    const data = parseFigureData("x,y\n0,1\n1,2\n");
    const svg = renderFigure(
      {
        width: 360,
        x: { label: "Step $t$" },
        y: { label: "Rate $\\eta$" },
        marks: [Plot.dot(data, { x: "x", y: "y", title: "y" })]
      },
      "Chart"
    );
    const boxes = foreignObjects(svg);
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box).toContain('pointer-events="none"');
  });
});
