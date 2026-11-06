import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { siteConfig } from "../../src/config/resolve";
import { packIco, renderFaviconIco, renderSvgPng } from "../../src/lib/meta/icons";
import { webManifest } from "../../src/lib/meta/manifest";
import { robotsTxt, validateRobotsDisallow } from "../../src/lib/meta/robots";

const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#8b1e3f"/></svg>'
);

describe("robots.txt", () => {
  it("allows everything and points at the sitemap index by default", () => {
    expect(robotsTxt({ url: "https://example.com", disallow: [] })).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap-index.xml\n"
    );
  });

  it("lists disallowed paths and builds the sitemap URL from the site URL", () => {
    expect(robotsTxt({ url: "https://awni.xyz/", disallow: ["/cv.pdf", "/cv/"] })).toBe(
      "User-agent: *\nDisallow: /cv.pdf\nDisallow: /cv/\n\nSitemap: https://awni.xyz/sitemap-index.xml\n"
    );
  });

  it("rejects rules that are not URL paths", () => {
    expect(validateRobotsDisallow(["/cv.pdf"]).errors).toEqual([]);
    expect(validateRobotsDisallow(["cv.pdf", "https://x.com/a", "/a b"]).errors).toHaveLength(3);
  });

  it("defaults to no disallowed paths", () => {
    expect(siteConfig.robots.disallow).toEqual([]);
  });
});

describe("icons", () => {
  it("renders an SVG at the requested pixel size", async () => {
    for (const size of [16, 512]) {
      const meta = await sharp(await renderSvgPng(svg, size)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["png", size, size]);
    }
  });

  it("packs PNGs into a valid ICO directory", () => {
    const pngs = [
      { size: 16, png: Buffer.from([1, 2, 3]) },
      { size: 256, png: Buffer.from([4, 5]) }
    ];
    const ico = packIco(pngs);
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    // First entry: 16px, 3 bytes, right after the header and two entries.
    expect(ico.readUInt8(6)).toBe(16);
    expect(ico.readUInt32LE(6 + 8)).toBe(3);
    expect(ico.readUInt32LE(6 + 12)).toBe(6 + 32);
    // 256px is stored as 0.
    expect(ico.readUInt8(22)).toBe(0);
    expect(ico.readUInt32LE(22 + 12)).toBe(6 + 32 + 3);
    expect([...ico.subarray(38)]).toEqual([1, 2, 3, 4, 5]);
    expect(() => packIco([{ size: 300, png: Buffer.alloc(1) }])).toThrow();
  });

  it("renders favicon.ico at 16, 32 and 48px", async () => {
    const ico = await renderFaviconIco(svg);
    expect(ico.readUInt16LE(4)).toBe(3);
    const sizes = [0, 1, 2].map((index) => ico.readUInt8(6 + 16 * index));
    expect(sizes).toEqual([16, 32, 48]);
    const offset = ico.readUInt32LE(6 + 12);
    const length = ico.readUInt32LE(6 + 8);
    const meta = await sharp(ico.subarray(offset, offset + length)).metadata();
    expect([meta.format, meta.width]).toEqual(["png", 16]);
  });
});

describe("web manifest", () => {
  it("names the site and lists the generated icons", () => {
    const manifest = webManifest({
      title: "Jane Doe",
      name: "Jane",
      description: "Research",
      backgroundColor: "#fff",
      themeColor: "#fff"
    });
    expect(manifest).toMatchObject({ name: "Jane Doe", short_name: "Jane", display: "browser" });
    expect(manifest.icons.map((icon) => icon.src)).toEqual(["/icon-192.png", "/icon-512.png"]);
  });
});
