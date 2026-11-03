import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * HoverNote and Term share one top-layer popover (src/lib/article/hoverPopover.ts).
 * These run against the dev-only fixture at /dev/hover-popovers.
 */

const FIXTURE = "/dev/hover-popovers";

const term = (page: Page, text: string) =>
  page.locator(".term").filter({ has: page.locator(".term__text", { hasText: text }) });
const pop = (root: Locator) => root.locator(".hover-pop");

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("Tab never reached the target");
}

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "hover and keyboard only");

  test("hover opens a term's note and leaving closes it", async ({ page }) => {
    await page.goto(FIXTURE);
    const root = term(page, "empirical science");
    await root.locator(".term__text").hover();
    await expect(pop(root)).toBeVisible();
    await expect(pop(root)).toHaveText("Rigorous experiments to understand phenomena in AI.");
    await page.mouse.move(0, 0);
    await expect(pop(root)).toBeHidden();
  });

  test("keyboard focus opens a note, Escape closes it, Enter reopens it", async ({ page }) => {
    await page.goto(FIXTURE);
    const root = term(page, "empirical science");
    await page.locator("h1").click();
    await tabTo(page, root.locator(".term__text"));
    await expect(pop(root)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(pop(root)).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(pop(root)).toBeVisible();
  });

  test("a note at the top of the article is not clipped", async ({ page }) => {
    await page.goto(FIXTURE);
    const note = page.locator(".hovernote").first();
    await note.locator(".hovernote__mark").hover();
    await expect(pop(note)).toBeVisible();
    // The middle of the note's own box must hit the note, not whatever an
    // overflow container would have left showing there.
    const hit = await pop(note).evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
      return Boolean(top && element.contains(top));
    });
    expect(hit).toBe(true);
  });

  test("a wrapped term anchors its note to the first line", async ({ page }) => {
    await page.goto(FIXTURE);
    const root = term(page, "long enough that it has to wrap");
    const text = root.locator(".term__text");
    const lines = await text.evaluate((element) =>
      [...element.getClientRects()].map(({ left, right, top, bottom }) => ({ left, right, top, bottom }))
    );
    expect(lines.length).toBeGreaterThan(1);
    // Hover the first line itself: a corner of the wrapped term's bounding box
    // can sit over the words before it.
    const [first] = lines;
    await page.mouse.move((first.left + first.right) / 2, (first.top + first.bottom) / 2);
    await expect(pop(root)).toBeVisible();
    const box = (await pop(root).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(first.top);
    const center = box.x + box.width / 2;
    const clamped = box.x <= 13 || box.x + box.width >= page.viewportSize()!.width - 13;
    if (!clamped) expect(Math.abs(center - (first.left + first.right) / 2)).toBeLessThan(2);
  });

  test("terms default to a dotted underline and accept underline=none", async ({ page }) => {
    await page.goto(FIXTURE);
    const style = (text: string) =>
      term(page, text)
        .locator(".term__text")
        .evaluate((element) => getComputedStyle(element).textDecorationStyle + " " + getComputedStyle(element).textDecorationLine);
    expect(await style("empirical science")).toBe("dotted underline");
    expect(await style("methodology")).toMatch(/none/);
  });
});

test.describe("touch", () => {
  test.skip(({ isMobile }) => !isMobile, "touch only");

  test("a tap opens a term's note and a second tap closes it", async ({ page }) => {
    await page.goto(FIXTURE);
    const root = term(page, "mathematical science");
    await root.locator(".term__text").tap();
    await expect(pop(root)).toBeVisible();
    await root.locator(".term__text").tap();
    await expect(pop(root)).toBeHidden();
  });

  test("a linked term opens on the first tap and follows the link on the second", async ({ page }) => {
    await page.goto(FIXTURE);
    const root = term(page, "linked term");
    await root.locator(".term__text").tap();
    await expect(pop(root)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${FIXTURE}/?$`));
    await root.locator(".term__text").tap();
    await expect(page).toHaveURL(/\/publications\/?$/);
  });
});
