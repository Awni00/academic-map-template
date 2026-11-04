import { expect, test, type Locator } from "@playwright/test";

/**
 * Homepage news titles with inline Markdown, against the dev-only fixture at
 * /dev/news (src/dev/NewsList.astro), so the checks do not depend on a site's
 * own news.yaml.
 */

const FIXTURE = "/dev/news";

const color = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).color);

test("renders inline Markdown titles as one inline run per entry", async ({ page }) => {
  await page.goto(FIXTURE);
  const entries = page.locator(".news dd");
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
  const entries = page.locator(".news dd");
  const link = entries.nth(0).locator("a");

  expect(await color(link.locator("em"))).toBe(await color(link));
  expect(await color(entries.nth(3).locator("a em"))).toBe(await color(entries.nth(3).locator("a")));
  // Outside a link, italics stand out in the foreground colour instead.
  expect(await color(entries.nth(2).locator("em"))).not.toBe(await color(link));
});

test("hovering italic text inside a link underlines the link", async ({ page, isMobile }) => {
  test.skip(isMobile, "no hover on touch");
  await page.goto(FIXTURE);
  const link = page.locator(".news dd").nth(0).locator("a");
  await expect(link).toHaveCSS("text-decoration-line", "none");
  await link.locator("em").hover();
  await expect(link).toHaveCSS("text-decoration-line", "underline");
});
