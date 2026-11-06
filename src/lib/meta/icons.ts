import sharp from "sharp";

import { readPublicFile } from "./publicFiles";

/**
 * Icons derived from the site's own `public/favicon.svg`.
 *
 * Browsers that understand SVG icons use the SVG directly; these raster copies
 * are for everything else: `/favicon.ico` (requested by old browsers, feed
 * readers, and many crawlers whatever the page links) and the web manifest's
 * PNG icons. Rendering them at build time keeps them in step with the SVG, so a
 * site only ever edits one file.
 */

/** Sizes packed into `/favicon.ico`: browser tabs, high-DPI tabs, Windows shortcuts. */
export const icoSizes = [16, 32, 48] as const;

/** Sizes the web manifest lists; 192 and 512 are what Android and Chrome ask for. */
export const manifestIconSizes = [192, 512] as const;

export function readFaviconSvg(root = process.cwd()): Buffer {
  const svg = readPublicFile("favicon.svg", root);
  if (!svg) {
    throw new Error("public/favicon.svg is missing; the raster icons are rendered from it.");
  }
  return svg;
}

/**
 * Render an SVG to a square PNG of `size` pixels.
 *
 * sharp rasterises an SVG at its intrinsic size (72 dpi), which for a 64-unit
 * viewBox is 64px; scaling that bitmap up to 512 would blur it. Raising the
 * density makes the vector render at the target size directly.
 */
export async function renderSvgPng(svg: Buffer, size: number): Promise<Buffer> {
  const { width = size, height = size } = await sharp(svg).metadata();
  const density = Math.min(72 * (size / Math.min(width, height)), 100_000);
  return sharp(svg, { density })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Pack square PNG images into one `.ico` file.
 *
 * The ICO container is a 6-byte header, one 16-byte directory entry per image,
 * then the images. Each entry may hold a whole PNG file, which every browser
 * and Windows since Vista reads, so no BMP conversion is needed. A width or
 * height of 256 is stored as 0.
 */
export function packIco(images: readonly { size: number; png: Buffer }[]): Buffer {
  const headerSize = 6;
  const entrySize = 16;
  const header = Buffer.alloc(headerSize + entrySize * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    if (!Number.isInteger(size) || size < 1 || size > 256) {
      throw new Error(`ICO images must be 1–256px square; got ${size}.`);
    }
    const entry = headerSize + entrySize * index;
    header.writeUInt8(size === 256 ? 0 : size, entry); // width
    header.writeUInt8(size === 256 ? 0 : size, entry + 1); // height
    header.writeUInt8(0, entry + 2); // palette size: none
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map((image) => image.png)]);
}

export async function renderFaviconIco(svg: Buffer): Promise<Buffer> {
  const images = await Promise.all(
    icoSizes.map(async (size) => ({ size, png: await renderSvgPng(svg, size) }))
  );
  return packIco(images);
}
