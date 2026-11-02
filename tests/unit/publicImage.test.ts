import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { publicImageSize, resolvePublicImagePath } from "../../src/lib/article/publicImage";

// A 1×1 PNG with its IHDR rewritten to 40×20; image-size reads only the header.
function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf.writeUInt8(8, 24);
  buf.writeUInt8(6, 25);
  return buf;
}

async function makeProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "public-image-"));
  await fs.mkdir(path.join(root, "public", "blog"), { recursive: true });
  return root;
}

describe("public image paths", () => {
  it("maps site-root paths into public/", async () => {
    const root = await makeProject();
    expect(resolvePublicImagePath("/blog/a%20b.png?v=2#x", root)).toBe(
      path.join(root, "public", "blog", "a b.png")
    );
  });

  it("refuses remote, protocol-relative, relative and escaping paths", async () => {
    const root = await makeProject();
    expect(resolvePublicImagePath("https://example.com/a.png", root)).toBeUndefined();
    expect(resolvePublicImagePath("//example.com/a.png", root)).toBeUndefined();
    expect(resolvePublicImagePath("blog/a.png", root)).toBeUndefined();
    expect(resolvePublicImagePath("/../secret.png", root)).toBeUndefined();
    expect(resolvePublicImagePath("/%E0%A4%A.png", root)).toBeUndefined();
  });
});

describe("publicImageSize", () => {
  it("reads raster dimensions from the file", async () => {
    const root = await makeProject();
    await fs.writeFile(path.join(root, "public", "blog", "wave.png"), pngHeader(40, 20));
    await expect(publicImageSize("/blog/wave.png", root)).resolves.toEqual({ width: 40, height: 20 });
  });

  it("reads SVG dimensions from the viewBox", async () => {
    const root = await makeProject();
    await fs.writeFile(
      path.join(root, "public", "blog", "chart.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420"></svg>'
    );
    await expect(publicImageSize("/blog/chart.svg", root)).resolves.toEqual({ width: 900, height: 420 });
  });

  it("re-reads a file that changed", async () => {
    const root = await makeProject();
    const file = path.join(root, "public", "blog", "swap.png");
    await fs.writeFile(file, pngHeader(10, 10));
    await expect(publicImageSize("/blog/swap.png", root)).resolves.toEqual({ width: 10, height: 10 });
    await fs.writeFile(file, pngHeader(30, 10));
    const later = new Date(Date.now() + 5000);
    await fs.utimes(file, later, later);
    await expect(publicImageSize("/blog/swap.png", root)).resolves.toEqual({ width: 30, height: 10 });
  });

  it("returns undefined for missing, unreadable or non-string sources", async () => {
    const root = await makeProject();
    await fs.writeFile(path.join(root, "public", "blog", "junk.png"), "not an image");
    await expect(publicImageSize("/blog/missing.png", root)).resolves.toBeUndefined();
    await expect(publicImageSize("/blog/junk.png", root)).resolves.toBeUndefined();
    await expect(publicImageSize("https://example.com/a.png", root)).resolves.toBeUndefined();
    await expect(publicImageSize({ src: "/blog/wave.png" }, root)).resolves.toBeUndefined();
  });
});
