/**
 * Convert a BibTeX publications file to the YAML the site reads.
 *
 *   npm run publications:from-bib -- [input.bib] [output.yaml]
 *
 * Defaults: src/data/publications.bib → src/data/publications.yaml. Refuses
 * to overwrite an existing output file.
 */
import fs from "node:fs/promises";

import { bibToYaml } from "../src/lib/publications/bibToYaml";

const [input = "src/data/publications.bib", output = "src/data/publications.yaml"] = process.argv.slice(2);

try {
  await fs.access(output);
  console.error(`${output} already exists; move it away or name another output file.`);
  process.exit(1);
} catch {
  // No file there yet: go ahead.
}

const yamlText = bibToYaml(await fs.readFile(input, "utf8"));
await fs.writeFile(output, `# Converted from ${input}. Check it, then run \`npm run validate\`.\n${yamlText}`);
console.log(`Wrote ${output}. Run \`npm run validate\` to check each citation against its entry.`);
