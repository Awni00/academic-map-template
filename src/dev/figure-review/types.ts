/**
 * Entries for the figure review page (`/dev/figures`, dev only).
 *
 * The entries themselves are site content: each post's live in
 * `src/site/figure-review/<post>.ts`, which default-exports
 * `definePaperReview({ … })`, so people working on different posts never
 * edit the same file. These types are the template's.
 */

/**
 * How the post showed the figure before it was rebuilt, drawn beside the
 * rebuild for comparison. Mirror the post's own markup.
 */
export type ReviewBefore =
  | { kind: "image"; src: string; invertInDarkMode?: boolean }
  | { kind: "pdf"; src: string; invertInDarkMode?: boolean }
  | { kind: "plotly"; src: string; height?: string }
  | { kind: "embed"; src: string; height?: string }
  | { kind: "none"; reason: string };

export type ReviewEntry = {
  /**
   * `<Chart figure>` id (path under src/site/figures without `.ts`), or with
   * `kind: "diagram"` a `<Diagram figure>` id under src/site/diagrams.
   */
  figure: string;
  kind?: "chart" | "diagram";
  /** Short label for the entry, e.g. "Learning curves, pairwise order". */
  label: string;
  alt: string;
  /** Leave out for a figure that is new rather than redrawn. */
  before?: ReviewBefore;
  /** Shown under the entry: data fidelity, layout changes, open questions. */
  note?: string;
};

export type PaperReview = {
  /** Post slug, matching src/content/writing/<post>.mdx and src/data/figures/<post>/. */
  post: string;
  /** The section's heading: the paper's or post's title. */
  paper: string;
  /** Section order on the page. */
  order: number;
  entries: ReviewEntry[];
};

export const definePaperReview = (review: PaperReview) => review;
