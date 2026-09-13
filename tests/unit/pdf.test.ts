import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isPdfSource, resolvePdfSource } from "../../src/lib/article/pdf";

describe("article PDF source resolution", () => {
  it("detects PDF sources with optional query strings", () => {
    expect(isPdfSource("/figures/example.pdf")).toBe(true);
    expect(isPdfSource("/figures/example.PDF?version=1#page=1")).toBe(true);
    expect(isPdfSource("/figures/example.png")).toBe(false);
    expect(isPdfSource({ src: "/figures/example.pdf" })).toBe(false);
  });

  it("resolves site-root PDF paths into public", async () => {
    const root = await makeProject();
    const pdf = path.join(root, "public", "figures", "example.pdf");
    await fs.mkdir(path.dirname(pdf), { recursive: true });
    await fs.writeFile(pdf, "%PDF-1.5\n");

    expect(resolvePdfSource("/figures/example.pdf", root)).toBe(pdf);
  });

  it("resolves explicit project-local PDF paths", async () => {
    const root = await makeProject();
    const pdf = path.join(root, "src", "assets", "example.pdf");
    await fs.mkdir(path.dirname(pdf), { recursive: true });
    await fs.writeFile(pdf, "%PDF-1.5\n");

    expect(resolvePdfSource("src/assets/example.pdf", root)).toBe(pdf);
  });

  it("rejects unsupported PDF sources", async () => {
    const root = await makeProject();
    expect(() => resolvePdfSource("https://example.com/figure.pdf", root)).toThrow(
      /local PDF/
    );
    expect(() => resolvePdfSource("../outside.pdf", root)).toThrow(/project root/);
    expect(() => resolvePdfSource("/figures/missing.pdf", root)).toThrow(/not found/);
    expect(() => resolvePdfSource("/figures/example.png", root)).toThrow(/\.pdf/);
  });

  it("names the source when a literal % makes the path undecodable", async () => {
    const root = await makeProject();
    const pdf = path.join(root, "public", "figures", "100%.pdf");
    await fs.mkdir(path.dirname(pdf), { recursive: true });
    await fs.writeFile(pdf, "%PDF-1.5\n");

    expect(() => resolvePdfSource("/figures/100%.pdf", root)).toThrow(
      'Picture PDF source is not a valid URL path: /figures/100%.pdf. Write a literal "%" as "%25".'
    );
    expect(resolvePdfSource("/figures/100%25.pdf", root)).toBe(pdf);
  });
});

async function makeProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "article-pdf-"));
  await fs.mkdir(path.join(root, "public"), { recursive: true });
  return root;
}
