import { expect, test, type Page } from "@playwright/test";

// The selection ring is painted on the canvas, so the DOM cannot say whether
// it is there. Record what the writing map actually paints instead:
//   - every label, keyed by text, with the graph-space point it was painted at
//     and the transform it was painted under, so a test can click a node by
//     name;
//   - every selection ring, by the graph point of the node it surrounds. A
//     label is painted at its node's x, a little above it, so a ring belongs to
//     the nearest label on its vertical.
// The ring is the one arc drawSelectionRing paints at 0.75 alpha
// (SELECTION_RING_ALPHA); nothing else on the map uses it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__labels = {};
    w.__rings = [];
    const proto = CanvasRenderingContext2D.prototype;
    const fillText = proto.fillText;
    proto.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
      if (this.canvas.closest(".graph-canvas")) {
        const m = this.getTransform();
        w.__labels[text] = {
          x,
          y,
          labelY: y,
          below: this.textBaseline !== "bottom",
          m: [m.a, m.b, m.c, m.d, m.e, m.f]
        };
      }
      return fillText.call(this, text, x, y, ...rest);
    };
    const arc = proto.arc;
    proto.arc = function (...args: Parameters<typeof arc>) {
      if (this.canvas.closest(".graph-canvas") && Math.abs(this.globalAlpha - 0.75) < 1e-6) {
        w.__rings.push({ x: args[0], y: args[1] });
      }
      return arc.apply(this, args);
    };
  });
});

async function openMap(page: Page, path = "/writing") {
  await page.goto(path);
  await waitForMap(page);
}

async function waitForMap(page: Page) {
  // Clicking before hydration would hit the server-rendered panel, which has
  // no handlers yet.
  await page.waitForFunction(
    () => !document.querySelector('astro-island[component-url*="GraphBrowser"][ssr]')
  );
  await page.locator(".graph-canvas").scrollIntoViewIfNeeded();
  await expect(page.locator(".graph-canvas canvas")).toBeVisible();
  // Wait for the layout to settle so a node is still where it was measured
  // by the time the click lands.
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
    const canvas = document.querySelector(".graph-canvas canvas") as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const [a, b, c, d, e, f] = entry.m;
    // Labels sit a glyph radius plus 7–9px above their node, in screen pixels
    // at any zoom, so 15px past the label's baseline lands inside the glyph.
    return {
      x: rect.left + (a * entry.x + c * entry.y + e) / dpr,
      y: rect.top + (b * entry.x + d * entry.y + f) / dpr + (entry.below ? -15 : 15)
    };
  }, label);
  expect(point, `no node labelled ${label} on the map`).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

/** Label of the node the most recent selection ring was painted around, if any. */
async function ringLabel(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    const ring = w.__rings.at(-1);
    if (!ring) return null;
    // Hubs can share a vertical, so x alone is ambiguous.
    const [match] = Object.entries(w.__labels)
      .filter(([, entry]: [string, any]) => Math.abs(entry.x - ring.x) < 0.5)
      .sort(
        ([, a]: [string, any], [, b]: [string, any]) =>
          Math.abs(a.labelY - ring.y) - Math.abs(b.labelY - ring.y)
      );
    return match ? match[0] : "(unlabelled node)";
  });
}

test("the map opens with nothing selected", async ({ page }) => {
  await openMap(page);
  const preview = page.locator(".preview-pane");
  await expect(preview).toContainText(/(Select|Tap) a node on the map/);
  await expect(preview.locator(".node-panel__title")).toHaveCount(0);
  // The panel listing the hubs is not a selection of any of them.
  await expect(preview.locator(".sidebar-section__label")).toContainText("Hubs");
  expect(await page.evaluate(() => (window as any).__rings.length)).toBe(0);
});

test("clicking a node shows its ring and its details together", async ({ page }) => {
  await openMap(page);
  await clickNode(page, "Hub 2");
  const title = page.locator(".preview-pane .node-panel__title");
  await expect(title).toHaveText("Hub 2");
  await expect.poll(() => ringLabel(page)).toBe("Hub 2");

  // Moving the selection moves both.
  await clickNode(page, "Hub 3");
  await expect(title).toHaveText("Hub 3");
  await expect.poll(() => ringLabel(page)).toBe("Hub 3");
});

test("picking a hub from the panel marks it on the canvas", async ({ page }) => {
  await openMap(page);
  await page.locator(".preview-pane .preview-link", { hasText: "Hub 4" }).click();
  await expect(page.locator(".preview-pane .node-panel__title")).toHaveText("Hub 4");
  await expect.poll(() => ringLabel(page)).toBe("Hub 4");
});

// Only the view round-trips through the URL; selection is session-only by
// design (see readStateFromUrl). So the URL-restored states to hold to the
// invariant are: arriving on another view and switching to the map, and a
// selection carried across a view switch, which remounts the canvas.
test("the map agrees with the panel after a view switch", async ({ page }) => {
  await page.goto("/writing?view=list");
  // The server renders the default view and the URL's view is applied after
  // hydration, so a click before then would be overwritten by it.
  await expect(page.getByRole("tab", { name: "list" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "map" }).click();
  await waitForMap(page);
  await expect(page.locator(".preview-pane")).toContainText(/(Select|Tap) a node on the map/);
  expect(await page.evaluate(() => (window as any).__rings.length)).toBe(0);

  await clickNode(page, "Hub 1");
  await expect(page.locator(".preview-pane .node-panel__title")).toHaveText("Hub 1");

  await page.getByRole("tab", { name: "topics" }).click();
  await expect(page).toHaveURL(/\?view=topics$/);
  await page.evaluate(() => {
    const w = window as any;
    w.__labels = {};
    w.__rings = [];
  });
  await page.getByRole("tab", { name: "map" }).click();
  await waitForMap(page);
  await expect(page.locator(".preview-pane .node-panel__title")).toHaveText("Hub 1");
  await expect.poll(() => ringLabel(page)).toBe("Hub 1");
});
