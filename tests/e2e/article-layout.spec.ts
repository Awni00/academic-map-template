import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The article-layout fixture (src/fixtures/ArticleLayout.astro): a paper page
 * with a long venue, several affiliations, wide BibTeX and math, and figures
 * beside margin asides. Each test pins a case that has rendered wrongly on a
 * real site.
 *
 * Each test sets its own viewport, so the suite runs in the desktop project
 * only.
 */

const PATH = "/fixtures/article-layout";

test.skip(({ isMobile }) => isMobile, "each test sets its own viewport");

async function open(browser: Browser, width: number, height = 900): Promise<Page> {
  const phone = width < 768;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: phone, isMobile: phone });
  const page = await context.newPage();
  await page.goto(PATH);
  await page.locator(".article-content").waitFor();
  return page;
}

test("a figure's maxWidth holds beside margin asides", async ({ browser }) => {
  const page = await open(browser, 1440);
  await expect(page.locator(".article-content")).toHaveAttribute("data-asides", "margin");
  const box = await page.locator(".fixture-capped-figure").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(320.5);
  await page.context().close();
});

test("embeds and grids fill the column by default", async ({ browser }) => {
  const page = await open(browser, 1440);
  const column = await page.locator(".article-content > p").first().boundingBox();
  for (const selector of [".fixture-default-plotly", ".fixture-default-embed", ".fixture-caption-grid"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box!.width, selector).toBeGreaterThan(column!.width - 2);
  }
  await page.context().close();
});

test("a lazy picture holds its 2:1 box before the image loads", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route(/fixture-wave/, () => {});
  await page.goto(PATH, { waitUntil: "domcontentloaded" });
  const box = await page.locator(".fixture-lazy-picture img").boundingBox();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.width / box!.height).toBeCloseTo(2, 1);
  await context.close();
});

test("caption props render inline markdown", async ({ browser }) => {
  const page = await open(browser, 1440);
  const caption = page.locator(".fixture-capped-figure figcaption");
  await expect(caption.locator("code")).toHaveText("maxWidth: 320px");
  await expect(caption.locator("em")).toHaveText("emphasis");
  await expect(caption.locator("a")).toHaveAttribute("href", "https://example.com");
  await expect(caption.locator(".katex")).toHaveCount(1);
  await expect(page.locator(".fixture-caption-grid > figcaption code")).toHaveText("var₀");
  await page.context().close();
});

test("wide display math is marked to fade where it overflows, and narrow math is not", async ({ browser }) => {
  const page = await open(browser, 1440);
  for (const scope of [".article-content > ", ".callout ", ".statement "]) {
    await expect(page.locator(`${scope}.katex-display`).first()).toHaveAttribute("data-overflow", "end");
  }
  await expect(page.locator(".article-content > .katex-display").nth(1)).not.toHaveAttribute("data-overflow");
  await page.context().close();
});

test("nested lists show markers", async ({ browser }) => {
  const page = await open(browser, 1440);
  const nested = page.locator(".fixture-nested-list li > :is(ul, ol)");
  for (const list of await nested.all()) {
    expect(await list.evaluate((element) => getComputedStyle(element).listStyleType)).not.toBe("none");
  }
  await page.context().close();
});

test("BibTeX lines stay whole and scroll sideways", async ({ browser }) => {
  const page = await open(browser, 1440);
  const code = page.locator(".cite-body__code");
  expect(await code.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("pre");
  await page.context().close();
});

test.describe("on a phone", () => {
  test("nothing pushes the page wider than the screen", async ({ browser }) => {
    const page = await open(browser, 390, 844);
    await page.locator(".toggle-figure[data-toggle-figure-enhanced]").waitFor();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    await page.context().close();
  });

  test("byline names never start a line with a comma", async ({ browser }) => {
    const page = await open(browser, 390, 844);
    const items = page.locator(".article-byline__list li");
    const tops = await items.evaluateAll((elements) =>
      elements.map((element) => [element.parentElement, element.getBoundingClientRect().top] as const)
    );
    // One per line: no two items in a list share a row.
    for (let i = 1; i < tops.length; i += 1) {
      if (tops[i][0] === tops[i - 1][0]) expect(tops[i][1]).toBeGreaterThan(tops[i - 1][1]);
    }
    expect(await items.evaluateAll((elements) => elements.some((e) => getComputedStyle(e, "::before").content.includes(",")))).toBe(false);
    await page.context().close();
  });

  test("the contents pill waits until the header has scrolled away", async ({ browser }) => {
    const page = await open(browser, 390, 640);
    const pill = page.locator(".contents-pill");
    await pill.waitFor({ state: "attached" });
    await expect(pill).toBeHidden();
    await page.locator("#math").scrollIntoViewIfNeeded();
    await expect(pill).toBeVisible();
    await page.context().close();
  });

  test("the Copy button sits clear of the first BibTeX line", async ({ browser }) => {
    const page = await open(browser, 390, 844);
    const button = await page.locator(".cite-body__copy").boundingBox();
    const code = await page.locator(".cite-body__code").boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(code!.y + 1);
    await page.context().close();
  });
});
