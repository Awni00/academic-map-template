import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

import { publicationsConfig, siteConfig, writingConfig, type EntryType } from "../src/config";
import { findPlotlyFigureReferences, plotlyHtmlNeedsMathJax } from "../src/lib/article/plotlyValidation";
import { resolveTocConfig } from "../src/lib/article/toc";
import { buildGraphIndex, graphWarningSeverity } from "../src/lib/graph/buildGraph";
import type { WritingEntryLike } from "../src/lib/graph/types";
import { parseBibtex } from "../src/lib/publications/parseBibtex";
import { stripSlashes } from "../src/lib/routes/paths";

const errors: string[] = [];
const warnings: string[] = [];

const entries = await readWritingEntries("src/content/writing");
validateEntries(entries);
const graphResult = buildGraphIndex(entries, { includeDrafts: true });

for (const warning of graphResult.warnings) {
  const severity = graphWarningSeverity(warning);
  if (severity === "error") errors.push(warning.message);
  if (severity === "warn") warnings.push(warning.message);
}

validateRoutes();
await validatePublications();
await validatePlotlyFigures(["src/content/writing", "src/content/pages"]);

for (const warning of warnings) console.warn(`Warning: ${warning}`);
for (const error of errors) console.error(`Error: ${error}`);

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Validation passed with ${warnings.length} warning(s).`);

async function readWritingEntries(root: string): Promise<WritingEntryLike[]> {
  const files = await listFiles(root);
  return Promise.all(
    files
      .filter((file) => /\.(md|mdx)$/.test(file))
      .map(async (file) => {
        const source = await fs.readFile(file, "utf8");
        const parsed = matter(source);
        return {
          id: path.relative(root, file).replace(/\.[^.]+$/, ""),
          body: parsed.content,
          data: {
            title: parsed.data.title,
            type: parsed.data.type,
            slug: parsed.data.slug,
            aliases: parsed.data.aliases ?? [],
            date: parsed.data.date,
            displayDates: parsed.data.displayDates,
            updated: parsed.data.updated,
            summary: parsed.data.summary,
            tags: parsed.data.tags ?? [],
            links: parsed.data.links ?? [],
            draft: parsed.data.draft ?? false,
            article: parsed.data.article
          }
        } as WritingEntryLike;
      })
  );
}

function validateEntries(entries: WritingEntryLike[]): void {
  const validTypes = new Set(writingConfig.entryTypes);
  for (const entry of entries) {
    if (!entry.data.title) errors.push(`${entry.id}: missing required title.`);
    if (!entry.data.type) errors.push(`${entry.id}: missing required type.`);
    if (entry.data.type && !validTypes.has(entry.data.type as EntryType)) {
      errors.push(`${entry.id}: invalid type "${entry.data.type}".`);
    }
    for (const key of ["date", "updated"] as const) {
      const value = entry.data[key];
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push(`${entry.id}: ${key} must use YYYY-MM-DD.`);
      }
    }
    if (entry.data.displayDates !== undefined) {
      if (!Array.isArray(entry.data.displayDates) || entry.data.displayDates.length === 0) {
        errors.push(`${entry.id}: displayDates must be a non-empty array.`);
      } else {
        entry.data.displayDates.forEach((item, index) => {
          const value = item as Partial<Record<"label" | "date", unknown>> | null;
          if (!value || typeof value.label !== "string" || !value.label) {
            errors.push(`${entry.id}: displayDates[${index}].label is required.`);
          }
          if (!value || typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
            errors.push(`${entry.id}: displayDates[${index}].date must use YYYY-MM-DD.`);
          }
        });
      }
    }
    try {
      resolveTocConfig(entry, writingConfig);
    } catch (error) {
      errors.push(`${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function validateRoutes(): void {
  const writingRoute = stripSlashes(writingConfig.route);
  const reserved = new Set(["", "publications", stripSlashes(writingConfig.rss.route)]);
  if (reserved.has(writingRoute)) errors.push(`writingConfig.route conflicts with a reserved route: ${writingConfig.route}`);
  for (const item of siteConfig.nav) {
    if (!item.label || !item.href) errors.push("Navigation items require label and href.");
  }
}

async function validatePublications(): Promise<void> {
  try {
    const source = await fs.readFile(publicationsConfig.source, "utf8");
    const publications = parseBibtex(source);
    if (publications.length === 0) warnings.push("No publications found.");
    if (siteConfig.homepage.selectedPublications.enabled && !publications.some((publication) => publication.selected)) {
      warnings.push("No selected publications found, but the homepage selected-publications section is enabled.");
    }
  } catch (error) {
    errors.push(`BibTeX parse failure: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validatePlotlyFigures(roots: string[]): Promise<void> {
  const files = (
    await Promise.all(
      roots.map(async (root) => {
        try {
          return await listFiles(root);
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT") return [];
          throw error;
        }
      })
    )
  )
    .flat()
    .filter((file) => /\.(md|mdx)$/.test(file));

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const reference of findPlotlyFigureReferences(file, source)) {
      try {
        const html = await fs.readFile(reference.htmlPath, "utf8");
        if (plotlyHtmlNeedsMathJax(html)) {
          warnings.push(
            `${reference.sourceFile}: PlotlyFigure src "${reference.src}" appears to contain Plotly TeX labels, but ${path.relative(
              process.cwd(),
              reference.htmlPath
            )} does not include MathJax. Export with include_mathjax="cdn" when TeX labels are used.`
          );
        }
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") continue;
        throw error;
      }
    }
  }
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    })
  );
  return files.flat();
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
