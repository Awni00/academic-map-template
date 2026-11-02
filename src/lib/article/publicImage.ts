import fs from "node:fs/promises";
import path from "node:path";

import { imageSize } from "image-size";

export type IntrinsicSize = { width: number; height: number };

const cache = new Map<string, { mtimeMs: number; size: IntrinsicSize | undefined }>();

/**
 * The file under `public/` that a site-root image path such as
 * `/blog/figure.png` is served from, or undefined when the path is not one:
 * a remote URL, a protocol-relative `//host/...`, a relative path, or a path
 * that would climb out of `public/`.
 */
export function resolvePublicImagePath(src: string, root = process.cwd()): string | undefined {
  const cleanSrc = src.split(/[?#]/, 1)[0];
  if (!cleanSrc.startsWith("/") || cleanSrc.startsWith("//")) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(cleanSrc);
  } catch {
    return undefined;
  }
  const publicDir = path.resolve(root, "public");
  const filePath = path.resolve(publicDir, `.${decoded}`);
  if (!filePath.startsWith(publicDir + path.sep)) return undefined;
  return filePath;
}

/**
 * Intrinsic width and height of an image given as a path under `public/`,
 * read from the file at build time.
 *
 * Imported images arrive with this metadata from `astro:assets`; a plain path
 * string has none, so without it a lazy `<img>` has no box until it loads.
 * Anything unreadable — a missing file, a format `image-size` does not know,
 * an SVG with neither width/height nor a viewBox — returns undefined, and the
 * image renders exactly as it did before: the browser still loads it, it just
 * cannot reserve the space.
 *
 * EXIF orientations 5–8 rotate the picture a quarter turn, so the displayed
 * box is the stored one transposed.
 */
export async function publicImageSize(
  src: unknown,
  root = process.cwd()
): Promise<IntrinsicSize | undefined> {
  if (typeof src !== "string") return undefined;
  const filePath = resolvePublicImagePath(src, root);
  if (!filePath) return undefined;

  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(filePath)).mtimeMs;
  } catch {
    return undefined;
  }
  const cached = cache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.size;

  let size: IntrinsicSize | undefined;
  try {
    const result = imageSize(await fs.readFile(filePath));
    if (result.width && result.height) {
      const turned = (result.orientation ?? 1) >= 5;
      size = turned
        ? { width: result.height, height: result.width }
        : { width: result.width, height: result.height };
    }
  } catch {
    size = undefined;
  }
  cache.set(filePath, { mtimeMs, size });
  return size;
}
