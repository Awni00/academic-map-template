import { expect, test, type Page } from "@playwright/test";

// Headless browsers do not reliably throttle background tabs. Drive the
// visibility event explicitly and advance only Date, leaving frame timing real.
async function visibility(page: Page, state: "hidden" | "visible") {
  await page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

async function paintCount(page: Page) {
  return page.evaluate(() => (window as any).__graphPositions.length as number);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__graphPositions = [];
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      if (this.canvas.closest(".local-graph-map")) {
        // Graph-space coordinates detect simulation movement independently of
        // zoom/pan animations, which could otherwise conceal a stopped engine.
        (window as any).__graphPositions.push(args.slice(0, 2));
      }
      return arc.apply(this, args);
    };
  });
});

test("footer graph waits for a visible tab and an in-view slot", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
  });
  await page.goto("/writing/hub-1/entry-1");
  const graph = page.locator(".local-graph-map");
  await expect(graph).toBeAttached();
  await expect(graph.locator(".graph-loading")).toBeAttached();
  await page.clock.setSystemTime(new Date(Date.now() + 20_000));
  await visibility(page, "visible");
  await expect(graph.locator("canvas")).toHaveCount(0);
  await graph.scrollIntoViewIfNeeded();
  await expect.poll(() => paintCount(page)).toBeGreaterThan(10);
});

for (const reason of ["hidden tab", "offscreen slot"] as const) {
  test(`unfinished layout resumes after a long pause: ${reason}`, async ({
    page,
  }) => {
    await page.goto("/writing/hub-1/entry-1");
    const graph = page.locator(".local-graph-map");
    await graph.scrollIntoViewIfNeeded();
    await expect.poll(() => paintCount(page)).toBeGreaterThan(0);
    if (reason === "hidden tab") await visibility(page, "hidden");
    else
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
    // Allow React to apply the pause, then check there are no further paints.
    await page.waitForTimeout(100);
    const pausedCount = await paintCount(page);
    await page.waitForTimeout(150);
    expect(await paintCount(page)).toBe(pausedCount);
    await page.clock.setSystemTime(new Date(Date.now() + 20_000));
    await page.evaluate(() => {
      (window as any).__graphPositions = [];
    });
    if (reason === "hidden tab") await visibility(page, "visible");
    else await graph.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const points = (window as any).__graphPositions as number[][];
          // A static frame repeats the same handful of node coordinates. Continuing
          // forces produce many distinct positions even if the camera also moves.
          return new Set(
            points.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`),
          ).size;
        }),
      )
      .toBeGreaterThan(30);
  });
}
