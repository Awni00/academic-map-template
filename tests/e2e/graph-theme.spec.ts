import { expect, test, type Page } from "@playwright/test";

/**
 * The graph paints onto a canvas, reading its colours from CSS custom
 * properties at paint time. force-graph stops painting once the simulation
 * cools (`autoPauseRedraw`), and flipping `data-theme` restyles the page around
 * the canvas without marking it dirty — so without the MutationObserver in
 * GraphCanvas.tsx the graph keeps the old theme's colours indefinitely.
 *
 * Waiting for the simulation to cool is the whole point of this test. While it
 * is still warm the canvas repaints every frame regardless, and the assertion
 * passes even with the observer removed.
 */
type FillWindow = { __fills: string[] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as FillWindow).__fills = [];
    const fill = CanvasRenderingContext2D.prototype.fill;
    // `fill` is overloaded, so the replacement is typed through the property
    // it is assigned to rather than through `Parameters<typeof fill>`, which
    // collapses to only the last overload.
    CanvasRenderingContext2D.prototype.fill = function (
      this: CanvasRenderingContext2D,
      ...args: unknown[]
    ) {
      if (this.canvas.closest(".local-graph-map")) {
        const style = this.fillStyle;
        if (typeof style === "string") {
          (window as unknown as FillWindow).__fills.push(style);
        }
      }
      return (fill as (...rest: unknown[]) => void).apply(this, args);
    } as typeof CanvasRenderingContext2D.prototype.fill;
  });
});

const fillCount = (page: Page) =>
  page.evaluate(() => (window as unknown as FillWindow).__fills.length);

const fills = (page: Page) =>
  page.evaluate(() => (window as unknown as FillWindow).__fills);

const clearFills = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as FillWindow).__fills = [];
  });

/** Wait until the canvas stops painting of its own accord. */
async function waitForCooldown(page: Page) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const before = await fillCount(page);
    await page.waitForTimeout(400);
    if ((await fillCount(page)) === before) return;
  }
  throw new Error(
    "graph never stopped repainting; cannot test the cooled case",
  );
}

test("the graph repaints when the theme changes after the simulation cools", async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.documentElement.dataset.theme = "light";
  });
  await page.goto("/writing/hub-1/entry-1");
  const graph = page.locator(".local-graph-map");
  await graph.scrollIntoViewIfNeeded();
  await expect(graph.locator("canvas")).toHaveCount(1);

  await expect.poll(() => fillCount(page)).toBeGreaterThan(5);
  const lightFills = new Set(await fills(page));

  await waitForCooldown(page);
  await clearFills(page);

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });

  // With the MutationObserver gone, nothing marks the canvas dirty and this
  // stays at zero — the graph sits there in the light theme's colours.
  await expect
    .poll(() => fillCount(page), { timeout: 5000 })
    .toBeGreaterThan(5);

  const darkFills = new Set(await fills(page));
  expect([...darkFills].sort()).not.toEqual([...lightFills].sort());
});
