/**
 * Regenerate the screenshot gallery in docs/gallery/.
 *
 * Each scene is captured from a running site at desktop, tablet, and phone
 * sizes, then set side by side in device frames, at one scale so the three
 * read at their true relative size. Light scenes are always made; a scene
 * marked `dark` is made again in the dark theme, for README images that
 * follow the reader's colour scheme.
 *
 *   npm run dev                      # in another terminal
 *   npm run gallery                  # or: npm run gallery -- --url http://localhost:4322
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";

type Theme = "light" | "dark";
type DeviceName = "desktop" | "tablet" | "phone";

type Scene = {
  id: string;
  path: string;
  /** Also render the scene in the dark theme. */
  dark?: boolean;
  /** Bring the page into the state worth showing. */
  prepare?: (page: Page, device: DeviceName) => Promise<void>;
};

const DEVICES: Record<DeviceName, { width: number; height: number; touch: boolean }> = {
  desktop: { width: 1280, height: 800, touch: false },
  tablet: { width: 820, height: 1100, touch: true },
  phone: { width: 393, height: 852, touch: true }
};

const selectHub = async (page: Page) => {
  await page.waitForFunction(() => !document.querySelector('astro-island[component-url*="GraphBrowser"][ssr]'));
  await page.locator(".preview-pane .preview-link", { hasText: "Hub 1" }).first().click();
};

const SCENES: Scene[] = [
  { id: "home", path: "/" },
  { id: "writing-map", path: "/writing/", dark: true, prepare: selectHub },
  { id: "writing-topics", path: "/writing/?view=topics" },
  { id: "writing-list", path: "/writing/?view=list" },
  {
    id: "article",
    path: "/writing/hub-1/entry-1/",
    dark: true,
    // Narrow screens: into the article, where the contents pill names the section.
    prepare: async (page, device) => {
      if (device === "desktop") return;
      await page.evaluate(() => {
        const heading = document.querySelector(".article-content h2");
        if (heading) window.scrollTo({ top: heading.getBoundingClientRect().top + scrollY - 140, behavior: "instant" });
      });
      // A small scroll back up brings the auto-hiding app bar back into view.
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollBy({ top: -60, behavior: "instant" }));
    }
  },
  {
    id: "menu",
    path: "/publications/",
    // Wherever the bar has become the app bar, with its menu open.
    prepare: async (page) => {
      const button = page.locator(".site-menu-button");
      if (await button.isVisible()) await button.click();
    }
  }
];

const SCALE = 0.5;
const OUT = "docs/gallery";

const BACKDROP: Record<Theme, { bg: string; bezel: string; chrome: string; dot: string }> = {
  light: { bg: "#f3f2ee", bezel: "#1b1c20", chrome: "#e7e5df", dot: "#cfccc4" },
  dark: { bg: "#17181c", bezel: "#3a3b42", chrome: "#26272c", dot: "#45464d" }
};

async function capture(browser: Browser, base: string, scene: Scene, device: DeviceName, theme: Theme) {
  const { width, height, touch } = DEVICES[device];
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: touch,
    hasTouch: touch,
    colorScheme: theme,
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.goto(new URL(scene.path, base).toString(), { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }" });
  await page.evaluate(() => document.fonts.ready);
  await scene.prepare?.(page, device);
  // Let force layouts settle and sheets finish opening.
  await page.waitForTimeout(2200);
  const shot = await page.screenshot({ type: "jpeg", quality: 90 });
  await context.close();
  return shot.toString("base64");
}

function frameHtml(shots: Record<DeviceName, string>, theme: Theme): string {
  const c = BACKDROP[theme];
  const size = (d: DeviceName) => `width:${DEVICES[d].width * SCALE}px;height:${DEVICES[d].height * SCALE}px`;
  const img = (d: DeviceName) => `<img style="${size(d)}" src="data:image/jpeg;base64,${shots[d]}">`;
  return `<!doctype html><html><body style="margin:0;background:${c.bg}">
  <div id="stage" style="display:inline-flex;align-items:flex-end;gap:36px;padding:48px 56px">
    <div style="border-radius:10px;overflow:hidden;box-shadow:0 18px 50px rgb(0 0 0/.18);border:1px solid ${c.chrome}">
      <div style="height:22px;background:${c.chrome};display:flex;gap:7px;align-items:center;padding:0 12px">
        ${`<span style="width:9px;height:9px;border-radius:50%;background:${c.dot}"></span>`.repeat(3)}
      </div>${img("desktop")}
    </div>
    <div style="border:8px solid ${c.bezel};border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgb(0 0 0/.2);display:flex">${img("tablet")}</div>
    <div style="border:7px solid ${c.bezel};border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgb(0 0 0/.2);display:flex">${img("phone")}</div>
  </div></body></html>`;
}

async function main() {
  const urlFlag = process.argv.indexOf("--url");
  const base = urlFlag > -1 ? process.argv[urlFlag + 1] : "http://localhost:4321";
  try {
    await fetch(base);
  } catch {
    console.error(`No site at ${base}. Start one with \`npm run dev\`, or pass --url.`);
    process.exit(1);
  }

  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const scene of SCENES) {
    for (const theme of scene.dark ? (["light", "dark"] as const) : (["light"] as const)) {
      const shots = {} as Record<DeviceName, string>;
      for (const device of Object.keys(DEVICES) as DeviceName[]) {
        shots[device] = await capture(browser, base, scene, device, theme);
      }
      const page = await browser.newPage({ deviceScaleFactor: 2 });
      await page.setContent(frameHtml(shots, theme));
      await page.locator("img").last().evaluate((el: HTMLImageElement) => el.decode());
      const file = path.join(OUT, `${scene.id}${theme === "dark" ? "-dark" : ""}.jpg`);
      await page.locator("#stage").screenshot({ path: file, type: "jpeg", quality: 82 });
      await page.close();
      console.log(`wrote ${file}`);
    }
  }
  await browser.close();
}

await main();
