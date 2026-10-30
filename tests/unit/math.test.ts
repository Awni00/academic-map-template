import katex from "katex";
import { describe, expect, it } from "vitest";

import { renderInlineMath } from "../../src/lib/math/inlineMath";
import { defaultMathMacros } from "../../src/lib/math/macros";
import { resolveMathMacros, selectedMathMacroPacks } from "../../src/lib/math/resolve";

describe("math macros", () => {
  it("generates calligraphic and blackboard letter shortcuts", () => {
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(defaultMathMacros[`\\cal${letter}`]).toBe(`\\mathcal{${letter}}`);
      expect(defaultMathMacros[`\\bb${letter}`]).toBe(`\\mathbb{${letter}}`);
    }

    expect(defaultMathMacros["\\cal"]).toBe("\\mathcal{#1}");
    expect(defaultMathMacros["\\bb"]).toBe("\\mathbb{#1}");
  });

  it("defines common delimiters, probability, and expectation helpers", () => {
    expect(defaultMathMacros["\\paren"]).toBe("\\left(#1\\right)");
    expect(defaultMathMacros["\\bracket"]).toBe("\\left[#1\\right]");
    expect(defaultMathMacros["\\norm"]).toBe("\\left\\lVert#1\\right\\rVert");
    expect(defaultMathMacros["\\probunder"]).toBe("\\underset{#1}{\\mathbb{P}}\\left[#2\\right]");
    expect(defaultMathMacros["\\expectunder"]).toBe("\\underset{#1}{\\mathbb{E}}\\left[#2\\right]");
  });

  it("resolves macros in default, global, then selected pack order", () => {
    const macros = resolveMathMacros({
      defaultMacros: { "\\A": "default", "\\B": "default" },
      globalMacros: { "\\B": "global", "\\C": "global" },
      macroPacks: {
        first: { "\\C": "first", "\\D": "first" },
        second: { "\\D": "second", "\\E": "second" }
      },
      selectedPacks: ["first", "second"]
    });

    expect(macros).toEqual({
      "\\A": "default",
      "\\B": "global",
      "\\C": "first",
      "\\D": "second",
      "\\E": "second"
    });
  });

  it("extracts selected macro packs from frontmatter", () => {
    expect(selectedMathMacroPacks({ math: { macros: ["paper", "appendix"] } })).toEqual([
      "paper",
      "appendix"
    ]);
    expect(selectedMathMacroPacks({ math: { macros: ["paper", 1, false] } })).toEqual(["paper"]);
    expect(selectedMathMacroPacks({})).toEqual([]);
  });

  it("rejects unknown macro packs with available pack names", () => {
    expect(() =>
      resolveMathMacros({
        macroPacks: { paper: {} },
        selectedPacks: ["missing"],
        sourceLabel: "example.mdx"
      })
    ).toThrow(/Unknown math macro pack "missing" in example\.mdx\. Available packs: paper\./);
  });

  it("renders representative generic macros with strict KaTeX errors", () => {
    expect(() =>
      katex.renderToString(
        "\\probunder{x \\simiid \\calD}{\\norm{x}_2 > 1} + \\expect{\\inner{u}{v}} + \\bbR",
        { macros: { ...defaultMathMacros }, throwOnError: true }
      )
    ).not.toThrow();
  });
});

describe("inline math in plain text", () => {
  const katexCount = (html: string) => html.split('class="katex"').length - 1;

  it("escapes prose and leaves text without math alone", () => {
    expect(renderInlineMath("A <b>bold</b> & plain claim.")).toBe(
      "A &lt;b&gt;bold&lt;/b&gt; &amp; plain claim."
    );
    expect(renderInlineMath('<script>alert("x")</script>')).not.toContain("<script>");
  });

  it("typesets $…$, $$…$$ and \\(…\\) inline", () => {
    const html = renderInlineMath("An $O(n^2)$ bound, $$x+y$$ and \\(\\theta\\) here.");
    expect(katexCount(html)).toBe(3);
    expect(html).not.toContain("katex-display");
    expect(html).toMatch(/^An <span class="katex">/);
    expect(html).toContain(" here.");
  });

  it("keeps escaped and unpaired dollars as text", () => {
    expect(renderInlineMath("It costs \\$5.")).toBe("It costs $5.");
    expect(renderInlineMath("A lone $ sign")).toBe("A lone $ sign");
    expect(renderInlineMath("Between $5 and $10 a month")).toBe("Between $5 and $10 a month");
  });

  it("expands the site's macros", () => {
    const html = renderInlineMath("Class $\\calF$.", defaultMathMacros);
    expect(katexCount(html)).toBe(1);
    expect(html).not.toContain("katex-error");
    expect(html).toContain("mathcal");
  });

  it("does not throw on malformed TeX", () => {
    expect(() => renderInlineMath("Broken $\\frac{1$ math")).not.toThrow();
  });
});

