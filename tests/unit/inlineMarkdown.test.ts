import { describe, expect, it } from "vitest";

import { renderInlineMarkdown } from "../../src/lib/article/inlineMarkdown";

describe("renderInlineMarkdown", () => {
  it("renders code, emphasis, strong and links", () => {
    expect(renderInlineMarkdown("The `var₀` head, *in situ*, **always**, see [paper](https://example.com).")).toBe(
      'The <code>var₀</code> head, <em>in situ</em>, <strong>always</strong>, see <a href="https://example.com">paper</a>.'
    );
  });

  it("renders math with KaTeX", () => {
    const html = renderInlineMarkdown("Loss at $t_1$.");
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("<em>");
  });

  it("keeps markup characters inside code and math literal", () => {
    expect(renderInlineMarkdown("`$x$ and *y*`")).toBe("<code>$x$ and *y*</code>");
    expect(renderInlineMarkdown("$a_1 + b_2$ then _c_")).toMatch(/<\/span> then <em>c<\/em>$/);
  });

  it("leaves snake_case, lone asterisks and escapes alone", () => {
    expect(renderInlineMarkdown("snake_case_name")).toBe("snake_case_name");
    expect(renderInlineMarkdown("2 * 3 * 4")).toBe("2 * 3 * 4");
    expect(renderInlineMarkdown("\\*not em\\*")).toBe("*not em*");
    expect(renderInlineMarkdown("costs $5 and $10")).toBe("costs $5 and $10");
  });

  it("escapes HTML and refuses script links", () => {
    expect(renderInlineMarkdown("<b>x</b> & [y](javascript:alert(1))")).toBe(
      "&lt;b&gt;x&lt;/b&gt; &amp; [y](javascript:alert(1))"
    );
    expect(renderInlineMarkdown('[a](/rel?x=1&y="2")')).toBe('<a href="/rel?x=1&amp;y=&quot;2&quot;">a</a>');
  });

  it("strips the padding space from a code span", () => {
    expect(renderInlineMarkdown("`` `tick` ``")).toBe("<code>`tick`</code>");
  });
});
