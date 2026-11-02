import { definePaperReview } from "../../fixtures/figure-review/types";

// Starter example: the figures in entry 4, listed for the dev-only review
// page at /fixtures/figures. One file per post; see docs/figures.md.
export default definePaperReview({
  post: "entry-4",
  paper: "Entry 4",
  order: 10,
  entries: [
    {
      figure: "entry-4/example-curves",
      label: "Example curves",
      alt: "Example score against step for Model A, its variant and a baseline."
    },
    {
      kind: "diagram",
      figure: "entry-4/example-pipeline",
      label: "Example pipeline",
      alt: "An input passes through a learned map to an output, with a feedback edge.",
      note: "Animated: plays once when it scrolls into view, then offers Replay."
    }
  ]
});
