import { expect, test, type Page } from "@playwright/test";

/**
 * Elements a keyboard user can Tab to that sit inside an `aria-hidden`
 * subtree. Focus lands on them but a screen reader announces nothing.
 */
async function hiddenTabStops(page: Page, scope: string) {
  return page.evaluate((scopeSelector) => {
    const focusable =
      'a[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]';
    return [...document.querySelectorAll<HTMLElement>(`${scopeSelector} [aria-hidden="true"]`)]
      .flatMap((hidden) => [hidden, ...hidden.querySelectorAll<HTMLElement>(focusable)])
      .filter((element) => element.matches(focusable))
      .filter((element) => element.tabIndex >= 0 && !element.hasAttribute("disabled"))
      .map((element) => element.outerHTML.slice(0, 120));
  }, scope);
}

for (const path of ["/publications", "/"]) {
  test(`publication thumbnails are not silent tab stops on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator(".publication-item").first()).toBeVisible();
    expect(await hiddenTabStops(page, ".publication-item")).toEqual([]);
  });
}

test("a publication preview opens enlarged", async ({ page }) => {
  await page.goto("/publications");
  const thumb = page.locator("button.publication-preview").first();
  // A real tab stop with a name, since it does something the link row does not.
  await expect(thumb).toHaveAttribute("aria-label", /^Enlarge preview image: .+/);
  await thumb.focus();
  await page.keyboard.press("Enter");

  const dialog = page.locator("dialog.publication-preview-dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute(
    "src",
    (await thumb.locator("img").getAttribute("src"))!,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The close button sits outside the card, above it, and still works.
  await thumb.click();
  const close = dialog.locator(".publication-preview-dialog__close");
  const [closeBox, cardBox] = [await close.boundingBox(), await dialog.boundingBox()];
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(cardBox!.y);
  await close.click();
  await expect(dialog).toHaveCount(0);
});

const citedEntry = "/writing/hub-1/entry-1";

test("cite copy falls back when the Clipboard API is missing", async ({
  page,
}) => {
  // Outside a secure context `navigator.clipboard` is undefined.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "clipboard", {
      get: () => undefined,
      configurable: true,
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(citedEntry);
  const copy = page.locator(".bibtex-block__copy");
  await copy.click();

  await expect(copy).toHaveText("Press ⌘C");
  expect(errors).toEqual([]);
  // The selection is the record exactly, so a manual copy is too.
  const citation = await page.locator("[data-bibtex]").getAttribute("data-bibtex");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(citation);
});

test("cite copy writes the citation when the clipboard is available", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto(citedEntry);
  const copy = page.locator(".bibtex-block__copy");
  await copy.click();

  await expect(copy).toHaveText("Copied");
  const citation = await page.locator("[data-bibtex]").getAttribute("data-bibtex");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(citation);
});
