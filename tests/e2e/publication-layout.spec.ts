import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Publication items on the homepage and /publications keep the preview on
 * the same row as the text at every width, at the art's 4:3 shape, and give
 * touch screens 44px link targets.
 *
 * Each test sets its own viewport, so the suite runs in the desktop project
 * only; the touch widths get a touch context of their own.
 */

type Width = { width: number; height: number; touch: boolean; preview: number };

const WIDTHS: Width[] = [
  { width: 1440, height: 900, touch: false, preview: 120 },
  { width: 768, height: 1024, touch: true, preview: 88 },
  { width: 560, height: 900, touch: true, preview: 88 },
  { width: 390, height: 844, touch: true, preview: 76 }
];
const PATHS = ["/", "/publications"];

test.skip(({ isMobile }) => isMobile, "each test sets its own viewport");

async function open(browser: Browser, width: Width, path: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: width.width, height: width.height },
    isMobile: width.touch,
    hasTouch: width.touch
  });
  const page = await context.newPage();
  await page.goto(path);
  await page.locator(".publication-item").first().waitFor();
  return page;
}

for (const path of PATHS) {
  for (const width of WIDTHS) {
    test(`publication preview sits beside the text on ${path} at ${width.width}px`, async ({
      browser
    }) => {
      const page = await open(browser, width, path);
      const items = await page.locator(".publication-item:not(.publication-item--compact)").evaluateAll((elements) =>
        elements.map((item) => {
          const preview = item.querySelector(".publication-preview")!.getBoundingClientRect();
          const body = item.querySelector(".publication-body")!.getBoundingClientRect();
          return {
            preview: { left: preview.left, right: preview.right, top: preview.top, width: preview.width, height: preview.height },
            body: { left: body.left, right: body.right, top: body.top }
          };
        })
      );
      expect(items.length).toBeGreaterThan(0);
      for (const { preview, body } of items) {
        expect(preview.width).toBeCloseTo(width.preview, 0);
        expect(preview.height).toBeCloseTo((width.preview * 3) / 4, 0);
        expect(preview.right).toBeLessThan(body.left);
        expect(Math.abs(preview.top - body.top)).toBeLessThanOrEqual(1);
        expect(body.right).toBeLessThanOrEqual(width.width);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.context().close();
    });
  }
}

test("publication links have 44px touch targets on a phone", async ({ browser }) => {
  const page = await open(browser, WIDTHS[3], "/publications");
  const targets = await page.locator(".publication-link").evaluateAll((links) =>
    links.map((link) => {
      const rect = link.getBoundingClientRect();
      const after = getComputedStyle(link, "::after");
      const hitHeight =
        after.content === "none"
          ? rect.height
          : rect.height - parseFloat(after.top) - parseFloat(after.bottom);
      return { text: link.textContent?.trim(), hitHeight };
    })
  );
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) expect(target.hitHeight, target.text).toBeGreaterThanOrEqual(44);
  await page.context().close();
});

test("items in a year group stay apart when a script sits between them", async ({ page }) => {
  await page.goto("/publications");
  const gap = await page.locator(".publication-year").evaluateAll((groups) => {
    const group = groups.find((section) => section.querySelectorAll(".publication-item").length >= 2);
    if (!group) return null;
    const [first, second] = group.querySelectorAll(".publication-item");
    // The page's own copy of this script lands after the first item on the
    // page; reproduce that here in whichever group has two items.
    first.after(document.createElement("script"));
    return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
  });
  expect(gap).not.toBeNull();
  expect(gap!).toBeGreaterThanOrEqual(28);
});
