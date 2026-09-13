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
    // The thumbnail link stays clickable; it only leaves the tab order,
    // since the title and the PDF link already reach the same place.
    await expect(page.locator("a.publication-preview").first()).toHaveAttribute(
      "href",
      /.+/,
    );
    expect(await hiddenTabStops(page, ".publication-item")).toEqual([]);
  });
}

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
  const copy = page.locator(".cite-body__copy");
  await copy.click();

  await expect(copy).toHaveText("Press ⌘C");
  expect(errors).toEqual([]);
  const citation = (await page.locator(".cite-body__code code").textContent()) ?? "";
  expect(await page.evaluate(() => window.getSelection()?.toString().trim())).toBe(
    citation.trim(),
  );
});

test("cite copy writes the citation when the clipboard is available", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto(citedEntry);
  const copy = page.locator(".cite-body__copy");
  await copy.click();

  await expect(copy).toHaveText("Copied");
  const citation = (await page.locator(".cite-body__code code").textContent()) ?? "";
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(citation.trim());
});
