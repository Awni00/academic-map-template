import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The homepage hero ("margin card") at the three layouts it has: desktop
 * 1440, tablet 768, phone 390. Most checks run against the dev-only hero
 * fixture (src/dev/HeroLayout.astro), whose variants are listed in
 * src/dev/heroVariants.ts, so both photo sides and every link style
 * are covered without changing the site config.
 *
 * Each test sets its own viewport, so the suite runs in the desktop project
 * only; the touch widths get a touch context of their own.
 */

type Width = { name: "desktop" | "tablet" | "phone"; width: number; height: number; touch: boolean };

const WIDTHS: Width[] = [
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "phone", width: 390, height: 844, touch: true }
];
const SIDES = ["left", "right"] as const;
const LINK_STYLES = ["pills", "icons", "list", "text", "text-icons"] as const;

test.skip(({ isMobile }) => isMobile, "each test sets its own viewport");

async function open(browser: Browser, width: Width, path: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: width.width, height: width.height },
    isMobile: width.touch,
    hasTouch: width.touch
  });
  const page = await context.newPage();
  await page.goto(path);
  await page.locator(".hero").waitFor();
  return page;
}

type Box = { left: number; right: number; top: number; bottom: number; width: number; height: number };

async function box(page: Page, selector: string): Promise<Box> {
  return page.locator(selector).first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  });
}

/** Every rendered line of text in the bio, in page coordinates. */
async function bioLines(page: Page): Promise<Box[]> {
  return page.locator(".hero-bio").evaluate((bio) => {
    const lines: Box[] = [];
    const walker = document.createTreeWalker(bio, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1) continue;
        lines.push({
          left: rect.left,
          right: rect.right,
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
          width: rect.width,
          height: rect.height
        });
      }
    }
    return lines;
  });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
}

for (const width of WIDTHS) {
  for (const side of SIDES) {
    test(`${width.name} ${width.width}px, photo ${side}: card placement and no sideways scroll`, async ({ browser }) => {
      const page = await open(browser, width, `/dev/hero/side-${side}_len-l`);
      await noHorizontalScroll(page);
      await expect(page.locator(".hero")).toHaveAttribute("data-hero-side", side);

      const card = await box(page, ".hero-card");
      const bio = await box(page, ".hero-bio");
      const photo = await box(page, ".hero-photo");

      if (width.name === "phone") {
        // Stacked: the card sits above the bio, centered, whichever side is set.
        expect(card.bottom).toBeLessThanOrEqual(bio.top + 1);
        expect(photo.width).toBeCloseTo(160, 0);
        expect(Math.abs((photo.left + photo.right) / 2 - width.width / 2)).toBeLessThan(1.5);
        expect(await page.locator(".hero").evaluate((el) => getComputedStyle(el).display)).toBe("block");
        expect(await page.locator(".hero-card").evaluate((el) => getComputedStyle(el).float)).toBe("none");
        return;
      }

      // Beside: card and bio share the first row.
      expect(Math.abs(card.top - bio.top)).toBeLessThan(2);
      const expectedWidth = width.name === "desktop" ? 240 : 180;
      const gap = width.name === "desktop" ? 56 : 32;
      expect(card.width).toBeCloseTo(expectedWidth, 0);
      if (side === "left") expect(bio.left - card.right).toBeCloseTo(gap, 0);
      else expect(card.left - bio.right).toBeCloseTo(gap, 0);

      // The long bio runs well past the card, and no line ever enters the
      // card's column: lines below the card start and end where the ones
      // beside it do.
      const lines = await bioLines(page);
      expect(lines.at(-1)!.bottom).toBeGreaterThan(card.bottom + 100);
      for (const line of lines) {
        if (side === "left") expect(line.left).toBeGreaterThanOrEqual(card.right + gap - 1);
        else expect(line.right).toBeLessThanOrEqual(card.left - gap + 1);
      }
      const below = lines.filter((line) => line.top > card.bottom);
      expect(below.length).toBeGreaterThan(0);
      expect(Math.min(...below.map((line) => line.left))).toBeGreaterThanOrEqual(bio.left - 1);
    });
  }
}

for (const width of WIDTHS.filter((w) => w.touch)) {
  for (const style of LINK_STYLES) {
    for (const side of SIDES) {
      test(`${width.name} ${width.width}px, ${style} links, photo ${side}: tap targets are at least 44px`, async ({ browser }) => {
        const page = await open(browser, width, `/dev/hero/side-${side}_links-${style}`);
        await noHorizontalScroll(page);
        await expectTapTargets(page);
      });
    }
  }
}

test("a touch screen wider than 900px still gets 44px link targets", async ({ browser }) => {
  const page = await open(browser, { name: "desktop", width: 1180, height: 820, touch: true }, "/dev/hero/default");
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
  await expectTapTargets(page);
});

/**
 * Every link's hit area spans 44px across and down through its center. Probed with
 * elementFromPoint rather than read from the box, because the 40px phone
 * pills reach 44 through an invisible margin. The probes sit 1px inside the
 * square's edge, since hit testing rounds fractional coordinates.
 */
async function expectTapTargets(page: Page) {
  const misses = await page.locator(".hero-link").evaluateAll((links) =>
    links.flatMap((link) => {
      const rect = link.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const reach = 21;
      // Edge midpoints, not corners: hit testing follows border-radius, so a
      // pill's rounded corners are never part of it.
      const points = [
        [cx, cy],
        [cx, cy - reach],
        [cx, cy + reach],
        [cx - reach, cy],
        [cx + reach, cy]
      ];
      return points
        .filter(([x, y]) => document.elementFromPoint(x, y)?.closest(".hero-link") !== link)
        .map(([x, y]) => `${link.textContent?.trim()} misses (${Math.round(x)}, ${Math.round(y)}); box ${Math.round(rect.width)}×${Math.round(rect.height)}`);
    })
  );
  expect(misses).toEqual([]);
}

type PillGrid = { cols: number; rows: number[]; widths: number[]; clipped: string[] };

async function pillGrid(page: Page): Promise<PillGrid> {
  return page.locator(".hero-links").evaluate((nav) => {
    const links = [...nav.children] as HTMLElement[];
    const rows = new Map<number, number>();
    for (const link of links) {
      const top = Math.round(link.getBoundingClientRect().top);
      rows.set(top, (rows.get(top) ?? 0) + 1);
    }
    return {
      cols: Number((nav as HTMLElement).dataset.cols),
      rows: [...rows.values()],
      widths: links.map((link) => Math.round(link.getBoundingClientRect().width * 10) / 10),
      // A pill whose icon or label reaches past its border.
      clipped: links
        .filter((link) => {
          const box = link.getBoundingClientRect();
          return (
            link.firstElementChild!.getBoundingClientRect().left < box.left + 1 ||
            link.lastElementChild!.getBoundingClientRect().right > box.right - 1
          );
        })
        .map((link) => link.textContent!.trim())
    };
  });
}

/** Rows hold `cols` pills each, except a last row that is at most one short. */
function expectBalanced(grid: PillGrid, count: number) {
  expect(grid.rows.reduce((a, b) => a + b, 0)).toBe(count);
  for (const row of grid.rows.slice(0, -1)) expect(row).toBe(grid.cols);
  expect(grid.rows.at(-1)!).toBeGreaterThanOrEqual(Math.max(1, grid.cols - 1));
  expect(new Set(grid.widths).size, `pill widths ${grid.widths}`).toBe(1);
  expect(grid.clipped).toEqual([]);
}

// One rule at every width: equal-width pills, as many columns as fit, and no
// short last row. Six links come out 3 + 3 on desktop and phone and 2 + 2 + 2
// in the 180px tablet card, rather than wrapping 2, 1, 2, 1.
const EXPECTED_COLS = { desktop: 3, tablet: 2, phone: 3 } as const;

for (const width of WIDTHS) {
  for (const side of SIDES) {
    test(`${width.name} ${width.width}px, photo ${side}: pills form equal-width, balanced rows`, async ({ browser }) => {
      const page = await open(browser, width, `/dev/hero/side-${side}`);
      const grid = await pillGrid(page);
      expect(grid.cols).toBe(EXPECTED_COLS[width.name]);
      expectBalanced(grid, 6);
      const links = await box(page, ".hero-links");
      if (width.name === "phone") {
        expect(Math.abs((links.left + links.right) / 2 - width.width / 2)).toBeLessThan(1.5);
      } else {
        // Beside the bio, the pills span exactly the photo's width.
        const photo = await box(page, ".hero-photo");
        expect(links.left).toBeCloseTo(photo.left, 0);
        expect(links.right).toBeCloseTo(photo.right, 0);
      }
    });
  }

  test(`${width.name} ${width.width}px: other link counts stay balanced`, async ({ browser }) => {
    // Nine links (with custom ones) and the template's default four.
    const custom = await open(browser, width, "/dev/hero/custom-1");
    expectBalanced(await pillGrid(custom), 9);
    const home = await open(browser, width, "/");
    expectBalanced(await pillGrid(home), await home.locator(".hero-link").count());
  });
}

test("without a photo, desktop pills share one row within the bio's measure", async ({ browser }) => {
  const page = await open(browser, WIDTHS[0], "/dev/hero/side-left_photo-none");
  const grid = await pillGrid(page);
  expect(grid.rows).toEqual([6]);
  expectBalanced(grid, 6);
  expect((await box(page, ".hero-links")).width).toBeLessThanOrEqual(661);
});

// The text styles follow the same rule as the pills, at their natural widths:
// rows hold the same number of links (the last at most one short), and no
// row ends on a separator.
for (const width of WIDTHS) {
  for (const style of ["text", "text-icons"] as const) {
    test(`${width.name} ${width.width}px, ${style} links: balanced rows that never end on a dot`, async ({ browser }) => {
      const page = await open(browser, width, `/dev/hero/side-left_links-${style}`);
      const rows = await page.locator(".hero-links").evaluate((nav) => {
        const links = [...nav.querySelectorAll(".hero-link")] as HTMLElement[];
        const out: { dots: boolean[]; overflow: boolean }[] = [];
        let top = -Infinity;
        for (const link of links) {
          const box = link.getBoundingClientRect();
          if (box.top > top + box.height / 2) {
            out.push({ dots: [], overflow: false });
            top = box.top;
          }
          const row = out.at(-1)!;
          row.dots.push(getComputedStyle(link, "::after").display !== "none" && getComputedStyle(link, "::after").content !== "none");
          if (box.right > nav.getBoundingClientRect().right + 0.5) row.overflow = true;
        }
        return out;
      });
      const counts = rows.map((row) => row.dots.length);
      for (const count of counts.slice(0, -1)) expect(count).toBe(counts[0]);
      expect(counts.at(-1)!).toBeGreaterThanOrEqual(Math.max(1, counts[0] - 1));
      for (const row of rows) {
        expect(row.overflow).toBe(false);
        expect(row.dots.at(-1), "a row ends on a separator").toBe(false);
        expect(row.dots.slice(0, -1).every(Boolean), "a separator is missing inside a row").toBe(true);
      }
      if (style === "text-icons") await expect(page.locator(".hero-link .hero-icon").first()).toBeVisible();
      else await expect(page.locator(".hero-link .hero-icon").first()).toBeHidden();
    });
  }
}

test("without JavaScript, pills fall back to wrapping at their own widths", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/dev/hero/default");
  await expect(page.locator(".hero-links")).not.toHaveAttribute("data-cols");
  await noHorizontalScroll(page);
  expect((await pillGrid(page)).clipped).toEqual([]);
});

for (const side of SIDES) {
  test(`phone compact layout, photo ${side}: a 76px photo beside the caption, above the bio`, async ({ browser }) => {
    const page = await open(browser, WIDTHS[2], `/dev/hero/side-${side}_phone-compact`);
    await noHorizontalScroll(page);
    const photo = await box(page, ".hero-photo");
    const meta = await box(page, ".hero-meta");
    const card = await box(page, ".hero-card");
    const bio = await box(page, ".hero-bio");
    expect(photo.width).toBeCloseTo(76, 0);
    expect(meta.left).toBeGreaterThan(photo.right);
    expect(Math.abs(meta.top - photo.top)).toBeLessThan(2);
    expect(card.bottom).toBeLessThanOrEqual(bio.top + 1);
  });

  test(`sticky card, photo ${side}: stays in view while the bio scrolls`, async ({ browser }) => {
    const page = await open(browser, WIDTHS[0], `/dev/hero/side-${side}_sticky-1_len-l`);
    // The site scrolls smoothly; jump so the card is measured where it settles.
    await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
    const top = await page.locator(".hero-card").evaluate((card) => card.getBoundingClientRect().top);
    const header = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().height);
    expect(top).toBeCloseTo(header + 24, 0);
  });
}

for (const width of WIDTHS) {
  test(`${width.name} ${width.width}px without a photo: caption and links lead the bio`, async ({ browser }) => {
    const page = await open(browser, width, "/dev/hero/side-left_photo-none");
    await noHorizontalScroll(page);
    await expect(page.locator(".hero-photo")).toHaveCount(0);
    const card = await box(page, ".hero-card");
    const bio = await box(page, ".hero-bio");
    expect(card.bottom).toBeLessThanOrEqual(bio.top + 1);
    if (width.name === "desktop") expect(bio.width).toBeLessThanOrEqual(661);
  });

  test(`${width.name} ${width.width}px: header, hero, and sections share their edges`, async ({ browser }) => {
    const page = await open(browser, width, "/");
    await noHorizontalScroll(page);
    const header = await box(page, ".site-header__inner");
    const hero = await box(page, ".hero");
    const section = await box(page, "main .section");
    for (const other of [hero, section]) {
      expect(other.left).toBeCloseTo(header.left, 0);
      expect(other.right).toBeCloseTo(header.right, 0);
    }
    const gutter = { desktop: 32, tablet: 24, phone: 16 }[width.name];
    expect(header.left).toBeGreaterThanOrEqual(gutter - 0.5);
    if (width.name === "desktop") expect(header.width).toBeCloseTo(956, 0);
  });
}

test("the homepage hero renders the card first, with the name as the page heading", async ({ browser }) => {
  const page = await open(browser, WIDTHS[0], "/");
  const order = await page.locator(".hero").evaluate((hero) => [...hero.children].map((child) => child.className));
  expect(order[0]).toContain("hero-card");
  expect(order[1]).toContain("hero-bio");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".hero-name")).toHaveText(/\S/);
  await expect(page.locator(".hero-link .hero-icon").first()).toBeVisible();
});

test("custom links get bundled icons and their own labels", async ({ browser }) => {
  const page = await open(browser, WIDTHS[0], "/dev/hero/custom-1");
  const labels = await page.locator(".hero-link__label").allTextContents();
  expect(labels.slice(-3)).toEqual(["ORCID", "Bluesky", "Lab"]);
  await expect(page.locator('.hero-link[data-link-key="orcid"] svg path')).toHaveCount(1);
  // No icon font or CDN stylesheet is involved.
  const external = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => (link as HTMLLinkElement).href).filter((href) => !href.startsWith(location.origin))
  );
  expect(external).toEqual([]);
});

test("a hidden name stays the page heading for screen readers", async ({ browser }) => {
  const page = await open(browser, WIDTHS[0], "/dev/hero/name-hide_extra-1");
  const heading = page.locator("h1.hero-name");
  await expect(heading).toHaveCount(1);
  expect(await heading.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  await expect(page.locator(".hero-extra")).toHaveCount(2);
});

test.describe("justified prose", () => {
  async function alignments(page: Page) {
    return page.locator(".hero-bio").evaluate((bio) => ({
      p: getComputedStyle(bio.querySelector("p")!).textAlign,
      li: getComputedStyle(bio.querySelector("li")!).textAlign,
      hyphens: getComputedStyle(bio.querySelector("p")!).hyphens,
      caption: getComputedStyle(document.querySelector(".hero-caption")!).textAlign
    }));
  }

  test("justifies the bio's paragraphs and list items only", async ({ browser }) => {
    const page = await open(browser, WIDTHS[0], "/dev/hero/len-l_justify-all");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("en");
    expect(await alignments(page)).toEqual({ p: "justify", li: "justify", hyphens: "auto", caption: "start" });
  });

  test('minWidth "tablet" leaves phones ragged', async ({ browser }) => {
    const tablet = await open(browser, WIDTHS[1], "/dev/hero/len-l_justify-tablet");
    expect((await alignments(tablet)).p).toBe("justify");
    const phone = await open(browser, WIDTHS[2], "/dev/hero/len-l_justify-tablet");
    expect(await alignments(phone)).toMatchObject({ p: "start", li: "start", hyphens: "manual" });
  });

  test("is off by default", async ({ browser }) => {
    const page = await open(browser, WIDTHS[0], "/dev/hero/side-left_len-l");
    expect((await alignments(page)).p).toBe("start");
  });
});
