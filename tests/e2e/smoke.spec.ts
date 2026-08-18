import { expect, test, type Locator } from "@playwright/test";

async function firstTextLineRect(locator: Locator) {
  return locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    let textOffset = -1;
    while (textNode) {
      textOffset = textNode.textContent?.search(/\S/) ?? -1;
      if (textOffset >= 0) break;
      textNode = walker.nextNode();
    }
    if (!textNode || textOffset < 0) return null;

    const range = document.createRange();
    range.setStart(textNode, textOffset);
    range.setEnd(textNode, textNode.textContent?.length ?? textOffset);
    const rect = range.getClientRects()[0];
    range.detach();
    return rect
      ? {
          x: rect.x,
          y: rect.y,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }
      : null;
  });
}

test("main static routes render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Name" })).toBeVisible();
  await page.goto("/publications");
  await expect(
    page.getByRole("heading", { name: "Publications" }),
  ).toBeVisible();
  await page.goto("/research");
  await expect(page.getByRole("heading", { name: "Research" })).toBeVisible();
});

test("mobile navbar uses available row width before wrapping", async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 800, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto("/");

    const linkRects = await page
      .locator(".site-nav__links a")
      .evaluateAll((links) =>
        links.map((link) => {
          const rect = link.getBoundingClientRect();
          return {
            text: link.textContent?.trim(),
            top: Math.round(rect.top),
          };
        }),
      );
    const home = linkRects.find((link) => link.text === "Home");
    const publications = linkRects.find((link) => link.text === "Publications");
    const rows = new Set(linkRects.map((link) => link.top));

    expect(home).toBeDefined();
    expect(publications).toBeDefined();
    expect(publications!.top).toBe(home!.top);
    expect(rows.size).toBe(1);
  } finally {
    await context.close();
  }
});

test("publication abstracts open as configured popups", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".publication-abstract")).toHaveCount(0);
  await page
    .locator('[data-dialog-open="abstract-example2026biasvariance"]')
    .click();
  const homeDialog = page.getByRole("dialog", {
    name: "Abstract for Bias and Variance: an Illustrated Refresher",
  });
  await expect(homeDialog).toBeVisible();
  await expect(homeDialog).toContainText(
    "A demo publication for the academic-graph template",
  );
  await homeDialog.getByRole("button", { name: "Close" }).click();

  await page.goto("/publications");
  await expect(page.locator(".publication-abstract")).toHaveCount(0);
  await page
    .locator('[data-dialog-open="abstract-example2026biasvariance"]')
    .click();
  const publicationsDialog = page.getByRole("dialog", {
    name: "Abstract for Bias and Variance: an Illustrated Refresher",
  });
  await expect(publicationsDialog).toBeVisible();
  await expect(publicationsDialog).toContainText(
    "A demo publication for the academic-graph template",
  );
});

test("writing browser supports URL state and preview", async ({ page }) => {
  await page.goto("/writing?view=map");
  await expect(page.getByRole("tab", { name: "map" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: /Machine Learning Theory/ }),
  ).toBeVisible();
  await expect(
    page.locator(".preview-pane").getByRole("heading").first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Entry" })).toHaveAttribute(
    "href",
    /\/writing\//,
  );
});

test("writing entry and RSS render", async ({ page }) => {
  await page.goto("/writing/machine-learning-theory/bias-variance-refresher");
  await expect(
    page.getByRole("heading", {
      name: "Bias and Variance: an Illustrated Refresher",
    }),
  ).toBeVisible();
  await expect(page.locator(".article-byline")).toContainText("Venue");
  await expect(page.locator(".article-byline")).toContainText(
    "Sample Conference on Learning Systems",
  );
  await expect(page.locator(".article-byline__col--date")).toContainText(
    "Date",
  );
  await expect(page.locator(".article-byline__col--date")).toContainText(
    "May 12, 2026",
  );
  await expect(page.locator(".article-byline")).not.toContainText("Published");
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.locator(".figure-grid[data-columns='2']")).toBeVisible();
  await expect(page.locator(".figure-grid")).toContainText(
    "Two complementary views of the bias-variance trade-off",
  );
  await page.goto("/writing/research-papers/vae-explainer");
  await expect(
    page.getByRole("heading", {
      name: "Variational autoencoders: a short explainer",
    }),
  ).toBeVisible();
  await expect(page.locator(".article-byline__col--date")).toContainText(
    "Page: May 18, 2026",
  );
  await expect(page.locator(".article-byline__col--date")).toContainText(
    "arXiv v1: Apr 7, 2026",
  );
  await expect(page.locator(".article-byline__col--date")).toContainText(
    "Demo venue: May 12, 2026",
  );

  const wrapFigure = page.locator(".vae-model-wrap");
  const wrapInnerFigure = wrapFigure.locator(".wrap-figure__figure");
  const wrapParagraphs = wrapFigure.locator(":scope > p");
  await expect(wrapFigure).toBeVisible();
  await expect(wrapParagraphs).toHaveCount(2);

  const wrapBox = await wrapFigure.boundingBox();
  const wrapFigureBox = await wrapInnerFigure.boundingBox();
  expect(wrapBox).not.toBeNull();
  expect(wrapFigureBox).not.toBeNull();

  const firstLine = await firstTextLineRect(wrapParagraphs.first());
  expect(firstLine).not.toBeNull();

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) > 680) {
    await expect(wrapInnerFigure).toHaveCSS("float", "right");
    expect(Math.abs(wrapFigureBox!.width - 340)).toBeLessThanOrEqual(1);
    expect(firstLine!.y).toBeLessThan(wrapFigureBox!.y + 40);
    expect(firstLine!.right).toBeLessThanOrEqual(wrapFigureBox!.x - 8);
  } else {
    await expect(wrapInnerFigure).toHaveCSS("float", "none");
    expect(Math.abs(wrapFigureBox!.width - wrapBox!.width)).toBeLessThanOrEqual(
      1,
    );
    expect(firstLine!.y).toBeGreaterThanOrEqual(
      wrapFigureBox!.y + wrapFigureBox!.height,
    );
  }

  const response = await page.goto("/writing/rss.xml");
  expect(await response?.text()).toContain('<rss version="2.0">');
});

test("abstract-mode entry renders its record layout", async ({ page }) => {
  await page.goto("/writing/research-papers/example-abstract");
  await expect(
    page.getByRole("heading", {
      name: "Latent structure in overparameterized models",
    }),
  ).toBeVisible();

  // The `article` frontmatter block must reach the layout. This also guards
  // the key name itself: Astro reserves `layout`, so renaming it back would
  // fail the build outright.
  const grid = page.locator(".article-grid");
  await expect(grid).toHaveAttribute("data-mode", "abstract");
  await expect(grid).toHaveAttribute("data-toc", "none");

  // The abstract owns the body, so no TOC rail is rendered.
  await expect(page.locator(".sidebar-section--toc")).toHaveCount(0);

  const block = page.locator(".abstract-block");
  await expect(block).toBeVisible();
  await expect(block.locator(".abstract-block__label")).toHaveText("Abstract");
  await expect(block).toContainText("Overparameterized models routinely fit");
  await expect(block.locator(".katex").first()).toBeVisible();

  // Header metadata still comes from the shared Distill-style header.
  await expect(page.locator(".article-byline")).toContainText("Venue");
  await expect(page.locator(".article-external")).toContainText("arXiv");
  await expect(page.locator(".article-hero img")).toBeVisible();

  // Abstract entries stay full graph citizens.
  const entryNav = page.getByRole("region", { name: "Entry navigation" });
  await expect(entryNav).toContainText("Backlinks");
  await expect(entryNav).toContainText("Related");
});

test("article column and footer share one left edge across layouts", async ({
  page,
}) => {
  const viewport = page.viewportSize();
  // Below the 980px breakpoint the grid collapses to a single block column,
  // where alignment is trivially satisfied; the invariant under test is the
  // multi-column one.
  if ((viewport?.width ?? 0) <= 980) return;

  const routes = [
    "/writing/research-papers", // hub, no rail rendered
    "/writing/research-papers/example-abstract", // abstract mode, no rail
    "/writing/education-teaching/bias-variance-by-example", // toc: none
    "/writing/machine-learning-theory/test-error-decomposition", // left toc
    "/writing/research-papers/vae-explainer", // left toc + margin asides
  ];

  const edges: number[] = [];
  for (const route of routes) {
    await page.goto(route);
    const header = await page.locator(".article-header").boundingBox();
    const footer = await page.locator(".entry-foot").boundingBox();
    expect(header, route).not.toBeNull();
    expect(footer, route).not.toBeNull();

    // The footer lives in the grid's body column, so it inherits both the
    // header's left edge and the prose measure.
    expect(Math.abs(header!.x - footer!.x), route).toBeLessThanOrEqual(1);
    expect(Math.abs(header!.width - footer!.width), route).toBeLessThanOrEqual(1);
    edges.push(header!.x);
  }

  // The left rail is reserved whether or not a sidebar renders into it, so
  // every layout starts at the same x. Without that reservation these split
  // into distinct groups depending on which rails each page happens to show.
  for (const edge of edges) {
    expect(Math.abs(edge - edges[0])).toBeLessThanOrEqual(1);
  }
});

test("media layout controls size figures and embeds", async ({ page }) => {
  await page.goto("/fixtures/media-layout-controls");
  await expect(page.locator("#media-layout-controls-fixture")).toBeVisible();

  const grid = page.locator(".fixture-equal-grid");
  await expect(grid).toHaveAttribute("data-equal-frames", "true");
  const bodies = grid.locator(".article-figure__body");
  await expect(bodies).toHaveCount(2);

  const firstBody = await bodies.nth(0).boundingBox();
  const secondBody = await bodies.nth(1).boundingBox();
  expect(firstBody).not.toBeNull();
  expect(secondBody).not.toBeNull();

  const mediaBoxes = await grid.locator(".article-figure__body > img").evaluateAll((images) =>
    images.map((image) => {
      const media = image.getBoundingClientRect();
      const body = image.closest(".article-figure__body")?.getBoundingClientRect();
      const caption = image.closest(".article-figure")?.querySelector("figcaption")?.getBoundingClientRect();
      return {
        mediaHeight: media.height,
        mediaBottom: media.bottom,
        bodyHeight: body?.height ?? 0,
        bodyBottom: body?.bottom ?? 0,
        captionTop: caption?.top ?? 0
      };
    })
  );

  for (const box of mediaBoxes) {
    expect(box.mediaHeight).toBeLessThanOrEqual(box.bodyHeight + 1);
    expect(box.mediaBottom).toBeLessThanOrEqual(box.bodyBottom + 1);
    expect(box.mediaBottom).toBeLessThanOrEqual(box.captionTop);
  }

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) > 680) {
    expect(
      Math.abs(firstBody!.height - secondBody!.height),
    ).toBeLessThanOrEqual(1);
    const captions = grid.locator(".article-figure > figcaption");
    const firstCaption = await captions.nth(0).boundingBox();
    const secondCaption = await captions.nth(1).boundingBox();
    expect(firstCaption).not.toBeNull();
    expect(secondCaption).not.toBeNull();
    expect(Math.abs(firstCaption!.y - secondCaption!.y)).toBeLessThanOrEqual(1);
  } else {
    expect(secondBody!.y).toBeGreaterThan(firstBody!.y);
  }

  const picture = page.locator(".fixture-picture");
  await expect(picture).toHaveAttribute("style", /--fixture-style-token: 1/);
  await expect(picture).toHaveCSS("padding", "12px");

  await expect(page.locator(".fixture-plotly .embed-frame__frame")).toHaveCSS(
    "height",
    "480px",
  );
  await expect(page.locator(".fixture-embed .embed-frame__frame")).toHaveCSS(
    "height",
    "360px",
  );

  // autoFit shrinks the iframe from its 360px placeholder to the embedded
  // content height (220px in the fixture), eliminating the whitespace gap.
  const autoFitFrame = page.locator(
    ".fixture-embed-autofit .embed-frame__frame",
  );
  await expect(autoFitFrame).toHaveAttribute("data-embed-auto-fit", "");
  await expect
    .poll(async () =>
      Math.round((await autoFitFrame.boundingBox())?.height ?? 0),
    )
    .toBeLessThan(300);
  expect((await autoFitFrame.boundingBox())!.height).toBeGreaterThan(200);
  // invertInDarkMode tags the iframe with the shared dark-mode invert class.
  await expect(autoFitFrame).toHaveClass(/invert-in-dark/);
  await expect(page.locator(".fixture-two-columns")).toHaveCSS("gap", "32px");
  await expect(page.locator(".fixture-image-comparison")).toBeVisible();
});

test("theme toggle changes preference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Theme:/ }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    /light|dark|system/,
  );
});
