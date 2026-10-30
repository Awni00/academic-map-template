import { expect, test, type Page } from "@playwright/test";

// The homepage "Explore Writing" map. Nodes are painted on a canvas, so record
// where each label is painted (as graph-selection.spec.ts does for the full
// map) to click a node by name.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__labels = {};
    const proto = CanvasRenderingContext2D.prototype;
    const fillText = proto.fillText;
    proto.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
      if (this.canvas.closest(".writing-preview")) {
        const dy = this.textBaseline === "bottom" ? 8 : -8;
        const m = this.getTransform();
        w.__labels[text] = { x, y: y + dy, m: [m.a, m.b, m.c, m.d, m.e, m.f] };
      }
      return fillText.call(this, text, x, y, ...rest);
    };
  });
});

async function openHomeMap(page: Page) {
  await page.goto("/");
  // Phones get topic cards unless the site sets `mobileMode: "graph"`.
  test.skip(
    !(await page.locator(".writing-preview__canvas").isVisible()),
    "homepage map hidden at this viewport"
  );
  await page.waitForFunction(
    () => !document.querySelector('astro-island[component-url*="WritingPreview"][ssr]')
  );
  await page.locator(".writing-preview__canvas").scrollIntoViewIfNeeded();
  await expect(page.locator(".writing-preview__canvas canvas")).toBeVisible();
  let previous = "";
  await expect
    .poll(async () => {
      const current = JSON.stringify(await page.evaluate(() => (window as any).__labels));
      const settled = current !== "{}" && current === previous;
      previous = current;
      return settled;
    }, { intervals: [300] })
    .toBe(true);
}

async function clickNode(page: Page, label: string) {
  const point = await page.evaluate((name) => {
    const entry = (window as any).__labels[name];
    if (!entry) return null;
    const canvas = document.querySelector(".writing-preview__canvas canvas") as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const [a, b, c, d, e, f] = entry.m;
    return {
      x: rect.left + (a * entry.x + c * entry.y + e) / dpr,
      y: rect.top + (b * entry.x + d * entry.y + f) / dpr
    };
  }, label);
  expect(point, `no node labelled ${label} on the homepage map`).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

test("clicking a homepage map node selects it without leaving the page", async ({ page }) => {
  await openHomeMap(page);
  const panel = page.locator(".writing-preview .node-panel");
  // Opens with nothing selected, as the full map does.
  await expect(panel).toContainText("Select a node on the map");
  await expect(panel.locator(".node-panel__title")).toHaveCount(0);

  await clickNode(page, "Hub 2");
  await expect(panel.locator(".node-panel__title")).toHaveText("Hub 2");
  expect(new URL(page.url()).pathname).toBe("/");

  const open = panel.locator(".node-panel__open");
  const href = await open.getAttribute("href");
  expect(href).toBeTruthy();
  await open.click();
  await expect(page).toHaveURL((url) => url.pathname === new URL(href!, url).pathname);
});

test("a hub in the homepage map's opening panel selects it", async ({ page }) => {
  await openHomeMap(page);
  const panel = page.locator(".writing-preview .node-panel");
  await panel.locator(".preview-link", { hasText: "Hub 3" }).click();
  await expect(panel.locator(".node-panel__title")).toHaveText("Hub 3");
});
