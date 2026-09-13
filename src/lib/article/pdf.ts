import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type RenderedPdfImage = {
  src: string;
  width: number;
  height: number;
  format: "png";
};

type RenderPdfOptions = {
  root?: string;
  scale?: number;
  emitToDist?: boolean;
};

type CachedPdfMetadata = {
  src: string;
  width: number;
  height: number;
  format: "png";
};

const DEFAULT_SCALE = 4;
const GENERATED_DIR = "__generated/pdf";
const CACHE_DIR = path.join(".astro", "pdf-cache");

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;

export function isPdfSource(src: unknown): src is string {
  return typeof src === "string" && /\.pdf(?:[?#].*)?$/i.test(src);
}

export function resolvePdfSource(src: string, root = process.cwd()): string {
  const cleanSrc = src.split(/[?#]/, 1)[0];

  if (!/\.pdf$/i.test(cleanSrc)) {
    throw new Error(`Picture PDF source must end in .pdf: ${src}`);
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(cleanSrc)) {
    throw new Error(`Picture only supports local PDF sources: ${src}`);
  }

  const projectRoot = path.resolve(root);
  let decodedSrc: string;
  try {
    decodedSrc = decodeURIComponent(cleanSrc);
  } catch (error) {
    throw new Error(
      `Picture PDF source is not a valid URL path: ${src}. Write a literal "%" as "%25".`,
      { cause: error }
    );
  }
  const pdfPath = decodedSrc.startsWith("/")
    ? path.resolve(projectRoot, "public", `.${decodedSrc}`)
    : path.resolve(projectRoot, decodedSrc);

  if (!isInside(projectRoot, pdfPath)) {
    throw new Error(`Picture PDF source must stay inside the project root: ${src}`);
  }

  if (!existsSync(pdfPath)) {
    throw new Error(`Picture PDF source was not found: ${src}`);
  }

  return pdfPath;
}

export async function renderPdfFirstPage(
  src: string,
  { root = process.cwd(), scale = DEFAULT_SCALE, emitToDist = false }: RenderPdfOptions = {}
): Promise<RenderedPdfImage> {
  const projectRoot = path.resolve(root);
  const pdfPath = resolvePdfSource(src, projectRoot);
  const pdfData = await fs.readFile(pdfPath);
  const hash = createHash("sha256")
    .update(pdfData)
    .update(`\0scale=${scale}`)
    .digest("hex")
    .slice(0, 16);
  const baseName = path.basename(pdfPath, path.extname(pdfPath)).replace(/[^a-z0-9_-]+/gi, "-");
  const outputName = `${baseName}-${hash}.png`;
  const publicSrc = `/${GENERATED_DIR}/${outputName}`;
  const cachePath = path.join(projectRoot, CACHE_DIR, outputName);
  const cacheMetadataPath = `${cachePath}.json`;

  const cached = await readCache(cacheMetadataPath, publicSrc);
  if (!cached || !existsSync(cachePath)) {
    const rendered = await renderPdfToCache(pdfData, pdfPath, cachePath, cacheMetadataPath, publicSrc, scale);
    await emitCachedImage(projectRoot, cachePath, outputName, emitToDist);
    return rendered;
  }

  await emitCachedImage(projectRoot, cachePath, outputName, emitToDist);
  return cached;
}

async function renderPdfToCache(
  pdfData: Buffer,
  pdfPath: string,
  cachePath: string,
  cacheMetadataPath: string,
  publicSrc: string,
  scale: number
): Promise<RenderedPdfImage> {
  const { getDocument } = await loadPdfjs();
  const standardFontDataUrl = pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + path.sep
  ).href;
  const loadingTask = getDocument({
    data: new Uint8Array(pdfData),
    disableWorker: true,
    standardFontDataUrl
  } as any);

  const pdfDocument = await loadingTask.promise;

  try {
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvasFactory = pdfDocument.canvasFactory as any;
    const canvasAndContext = canvasFactory.create(width, height);

    try {
      await page.render({
        canvas: canvasAndContext.canvas,
        canvasContext: canvasAndContext.context,
        viewport
      } as any).promise;

      const image = canvasAndContext.canvas.toBuffer("image/png");
      const metadata = { src: publicSrc, width, height, format: "png" as const };

      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, image);
      await fs.writeFile(cacheMetadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
      return metadata;
    } finally {
      page.cleanup();
      canvasFactory.destroy(canvasAndContext);
    }
  } catch (error) {
    throw new Error(`Failed to render PDF figure ${pdfPath}`, { cause: error });
  } finally {
    await pdfDocument.destroy();
  }
}

async function loadPdfjs(): Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const canvas = await import("canvas");
      (globalThis as any).DOMMatrix ??= canvas.DOMMatrix;
      (globalThis as any).ImageData ??= canvas.ImageData;
      return import("pdfjs-dist/legacy/build/pdf.mjs");
    })();
  }

  return pdfjsPromise;
}

async function readCache(metadataPath: string, publicSrc: string): Promise<CachedPdfMetadata | undefined> {
  try {
    const raw = await fs.readFile(metadataPath, "utf8");
    const metadata = JSON.parse(raw) as CachedPdfMetadata;
    return metadata.format === "png" && metadata.src === publicSrc ? metadata : undefined;
  } catch {
    return undefined;
  }
}

async function emitCachedImage(
  projectRoot: string,
  cachePath: string,
  outputName: string,
  emitToDist: boolean
): Promise<void> {
  const publicPath = path.join(projectRoot, "public", GENERATED_DIR, outputName);
  await copyIfChanged(cachePath, publicPath);

  if (emitToDist) {
    const distPath = path.join(projectRoot, "dist", GENERATED_DIR, outputName);
    await copyIfChanged(cachePath, distPath);
  }
}

async function copyIfChanged(from: string, to: string): Promise<void> {
  const [source, target] = await Promise.all([
    fs.readFile(from),
    fs.readFile(to).catch(() => undefined)
  ]);

  if (target && source.equals(target)) return;

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, source);
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
