/**
 * LaTeX in BibTeX values, turned into the plain text a page displays.
 */

const COMBINING_ACCENTS: Record<string, string> = {
  '"': "̈",
  "'": "́",
  "`": "̀",
  "^": "̂",
  "~": "̃",
  "=": "̄",
  ".": "̇",
  u: "̆",
  v: "̌",
  H: "̋",
  c: "̧"
};

const LETTER_COMMANDS: Record<string, string> = {
  ss: "ß",
  o: "ø",
  O: "Ø",
  aa: "å",
  AA: "Å",
  ae: "æ",
  AE: "Æ",
  oe: "œ",
  OE: "Œ",
  l: "ł",
  L: "Ł",
  i: "ı"
};

/**
 * Plain text from the LaTeX that real-world BibTeX carries: `{BERT}` case
 * protection, `{\"o}` accents, `\&`, `--`. Math (`$…$`) is left alone.
 */
export function cleanLatex(value: string): string {
  return value
    .replace(/\\([`'^"~=.uvHc])\s*\{?\s*([A-Za-z])\}?/g, (_, accent: string, letter: string) =>
      `${letter}${COMBINING_ACCENTS[accent]}`.normalize("NFC")
    )
    .replace(/\\(ss|aa|AA|ae|AE|oe|OE|[oOlLi])(?![A-Za-z])\s?/g, (_, command: string) => LETTER_COMMANDS[command])
    .replace(/\\([&%$#_])/g, "$1")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/~/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
