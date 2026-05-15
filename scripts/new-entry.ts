import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { writingConfig, type EntryType } from "../src/config/writing";
import { canonicalizeWritingPath } from "../src/lib/graph/resolveLinks";

const args = parseArgs(process.argv.slice(2));
const type = (args.type as EntryType | undefined) ?? (await promptType());
const title = args.title ?? (await promptTitle());

if (!writingConfig.entryTypes.includes(type)) {
  throw new Error(`Invalid type "${type}". Expected one of ${writingConfig.entryTypes.join(", ")}.`);
}

const entryPath = canonicalizeWritingPath(args.path ?? args.slug ?? title);
if (!entryPath) throw new Error("Entry path must not be empty.");
const filePath = path.join("src/content/writing", type === "hub" ? entryPath : `${entryPath}.mdx`);
const finalPath = type === "hub" ? path.join(filePath, "index.mdx") : filePath;
await assertNoDuplicatePath(entryPath);
await fs.mkdir(path.dirname(finalPath), { recursive: true });
await fs.writeFile(finalPath, frontmatter(title, type), "utf8");
console.log(`Created ${finalPath}`);

function parseArgs(values: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    parsed[value.slice(2)] = values[index + 1];
    index += 1;
  }
  return parsed;
}

async function promptType(): Promise<EntryType> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`Type (${writingConfig.entryTypes.join(", ")}): `);
  rl.close();
  return (answer.trim() || "note") as EntryType;
}

async function promptTitle(): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("Title: ");
  rl.close();
  if (!answer.trim()) throw new Error("Title is required.");
  return answer.trim();
}

async function assertNoDuplicatePath(entryPath: string): Promise<void> {
  const files = await listFiles("src/content/writing");
  for (const file of files.filter((value) => /\.(md|mdx)$/.test(value))) {
    const existingPath = canonicalizeWritingPath(path.relative("src/content/writing", file));
    if (existingPath === entryPath) throw new Error(`An entry with path "${entryPath}" already exists at ${file}.`);
  }
}

function frontmatter(title: string, type: EntryType): string {
  const today = new Date().toISOString().slice(0, 10);
  return `---
title: "${escapeYaml(title)}"
type: "${type}"
date: "${today}"
tags: []
links: []
draft: true
theme: global
---

Write the entry here.
`;
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
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
