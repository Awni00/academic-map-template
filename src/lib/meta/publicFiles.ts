import fs from "node:fs";
import path from "node:path";

/** Where a file under `public/` lives on disk. Builds and the dev server run from the project root. */
export function publicFilePath(name: string, root = process.cwd()): string {
  return path.join(root, "public", name);
}

/** A file under `public/`, or `undefined` when the site does not provide it. */
export function readPublicFile(name: string, root = process.cwd()): Buffer | undefined {
  const file = publicFilePath(name, root);
  return fs.existsSync(file) ? fs.readFileSync(file) : undefined;
}
