import type { EntryType } from "../../src/config";
import { canonicalizeWritingPath, normalizeKey } from "../../src/lib/graph/resolveLinks";

/**
 * The file-content side of `npm run new:entry`, kept apart from the script so
 * it can be tested without running the prompts or writing files.
 */

/**
 * Writing path for a new entry. An explicit `--path` (or `--slug`) may nest
 * folders; a title is one segment, so "Encoder/Decoder Models" does not create
 * an "encoder" folder. Returns "" when nothing usable is left.
 */
export function newEntryPath(options: { title: string; path?: string; slug?: string }): string {
  const explicit = options.path ?? options.slug;
  if (explicit !== undefined) return canonicalizeWritingPath(explicit);
  return canonicalizeWritingPath(normalizeKey(options.title.replace(/[\\/]+/g, " ")));
}

/** Today's date as YYYY-MM-DD in local time, which is the day the author sees. */
export function localDateString(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function newEntryFrontmatter(title: string, type: EntryType, date: string): string {
  // A JSON string is a valid YAML double-quoted scalar, and JSON.stringify
  // escapes backslashes, so a title like "$\alpha$" survives the round trip.
  return `---
title: ${JSON.stringify(title)}
type: ${JSON.stringify(type)}
date: "${date}"
tags: []
links: []
draft: true
theme: global
---

Write the entry here.
`;
}
