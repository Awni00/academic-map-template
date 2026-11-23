import { expect, test, type Locator } from "@playwright/test";

/**
 * Homepage news titles with inline Markdown, and both news placements,
 * against the dev-only fixture at /dev/news (src/dev/NewsList.astro), so the
 * checks do not depend on a site's own news.yaml or config.
 */

const FIXTURE = "/dev/news";
const BESIDE = '[data-news-placement="beside-publications"] .news';
const BELOW = '[data-news-placement="below-publications"] .news';

const color = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).color);

test("renders inline Markdown titles as one inline run per entry", async ({ page }) => {
  await page.goto(FIXTURE);
  const entries = page.locator(`${BESIDE} dd`);
  await expect(entries).toHaveCount(5);

  const preprint = entries.nth(0).getByRole("link", { name: "Putting Transformer Theories to the Test" });
  await expect(preprint).toHaveAttribute("href", "https://arxiv.org/abs/2610.32104");
  await expect(preprint.locator("em")).toHaveText("Putting Transformer Theories to the Test");
  await expect(entries.nth(0)).toHaveText("New preprint: Putting Transformer Theories to the Test");

  const talk = entries.nth(1);
  await expect(talk.getByRole("link")).toHaveCount(2);
  await expect(talk.getByRole("link", { name: "CoT Information" })).toHaveAttribute("href", "/publications");
  await expect(talk.getByRole("link", { name: "FLaNN Seminar" })).toHaveAttribute(
    "href",
    "https://flannseminars.github.io/"
  );

  await expect(entries.nth(2).locator("strong")).toHaveText("ICML");
  await expect(entries.nth(3).getByRole("link")).toHaveAttribute("href", "/publications");
  await expect(entries.nth(3).locator("a > em")).toHaveText("Entry 1");

  // Raw HTML in a title is text, not markup.
  await expect(entries.nth(4).locator("b")).toHaveCount(0);
  await expect(entries.nth(4)).toHaveText("Plain title with <b>raw HTML</b> & code");
});

test("italic text inside a link keeps the link colour", async ({ page }) => {
  await page.goto(FIXTURE);
  const entries = page.locator(`${BESIDE} dd`);
  const link = entries.nth(0).locator("a");

  expect(await color(link.locator("em"))).toBe(await color(link));
  expect(await color(entries.nth(3).locator("a em"))).toBe(await color(entries.nth(3).locator("a")));
  // Outside a link, italics stand out in the foreground colour instead.
  expect(await color(entries.nth(2).locator("em"))).not.toBe(await color(link));
});

test("hovering italic text inside a link underlines the link", async ({ page, isMobile }) => {
  test.skip(isMobile, "no hover on touch");
  await page.goto(FIXTURE);
  const link = page.locator(`${BESIDE} dd`).nth(0).locator("a");
  await expect(link).toHaveCSS("text-decoration-line", "none");
  await link.locator("em").hover();
  await expect(link).toHaveCSS("text-decoration-line", "underline");
});

type Box = { x: number; y: number; width: number; height: number };
const boxes = (locator: Locator): Promise<Box[]> =>
  locator.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    })
  );

test("below publications, items run two to a row on wide screens, newest first", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones get one column; see the next test");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(FIXTURE);
  const dates = await boxes(page.locator(`${BELOW} dt`));
  const titles = await boxes(page.locator(`${BELOW} dd`));
  expect(titles).toHaveLength(6);

  // Rows read across: 1 2 / 3 4 / 5 6, each pair top-aligned.
  for (let row = 0; row < 3; row += 1) {
    const [left, right] = [titles[2 * row], titles[2 * row + 1]];
    expect(right.x).toBeGreaterThan(left.x + left.width);
    expect(right.y).toBeCloseTo(left.y, 0);
    if (row > 0) expect(left.y).toBeGreaterThan(titles[2 * row - 2].y);
  }
  // The long third entry makes its row taller than its neighbour, which
  // starts at the top rather than stretching or centring.
  expect(titles[2].height).toBeGreaterThan(titles[3].height);

  // "September 18, 2026" stays on one line, as tall as "May 2026".
  expect(dates[0].height).toBeCloseTo(dates[3].height, 0);
});

test("below publications, phones get a single column", async ({ browser, isMobile }) => {
  test.skip(isMobile, "sets its own phone viewport, so one project is enough");
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(FIXTURE);
  const titles = await boxes(page.locator(`${BELOW} dd`));
  expect(new Set(titles.map((title) => Math.round(title.x))).size).toBe(1);
  for (let index = 1; index < titles.length; index += 1) {
    expect(titles[index].y).toBeGreaterThan(titles[index - 1].y);
  }
  await context.close();
});
