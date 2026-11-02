import { NEUTRAL, SERIES } from "../../../lib/figures";
import { canvas, defineDiagram } from "../../../lib/figures/diagram";

// Starter example: an input, a learned map and an output, with a feedback
// edge, drawn in three steps when it scrolls into view. Replace it with your
// own (see docs/figures.md).

// The steps appear one after another; the static drawing is the last frame.
const STYLE = `<style>
.figure-diagram[data-armed]:not([data-play]) .ex4-step { opacity: 0; }
.figure-diagram[data-play] .ex4-step { animation: ex4-in 450ms ease-out both; }
.figure-diagram[data-play] .ex4-step-2 { animation-delay: 350ms; }
.figure-diagram[data-play] .ex4-step-3 { animation-delay: 700ms; }
@keyframes ex4-in { from { opacity: 0; } to { opacity: 1; } }
</style>`;

export default defineDiagram({
  size: "medium",
  alt: "An input x passes through a learned map f to an output y-hat; a dashed feedback edge returns from the output to the input.",
  legend: [
    { label: "Data", color: SERIES[2], key: "region" },
    { label: "Feedback", color: NEUTRAL, key: "arrow" }
  ],
  animate: { delay: 300 },
  draw: ({ width, compact }) => {
    const box = { w: 120, h: 50 };
    // Wide: left to right. Compact: top to bottom.
    const [input, map, output] = compact
      ? [
          { x: width / 2, y: 45 },
          { x: width / 2, y: 150 },
          { x: width / 2, y: 255 }
        ]
      : [
          { x: 85, y: 110 },
          { x: width / 2, y: 110 },
          { x: width - 85, y: 110 }
        ];
    const node = { ...map, r: 30 };
    const c = canvas(width, compact ? 300 : 220).raw(STYLE);

    c.raw(`<g class="ex4-step ex4-step-1">`)
      .rect(input.x - box.w / 2, input.y - box.h / 2, box.w, box.h, { tone: 3, radius: 4 })
      .label(input, "Input $x$", { tone: "ink" })
      .raw(`</g><g class="ex4-step ex4-step-2">`);

    if (compact) {
      c.arrow({ x: input.x, y: input.y + box.h / 2 + 2 }, { x: map.x, y: map.y - node.r - 2 });
    } else {
      c.arrow({ x: input.x + box.w / 2 + 2, y: input.y }, { x: map.x - node.r - 2, y: map.y });
    }
    c.circle(node, node.r, { tone: 1, fill: "strong" }).label(node, "$f_\\theta$", { tone: "inverse", size: "lg" });
    const loopLabel = c.loop(node, compact ? 0 : -90, { tone: "muted" });
    c.label(loopLabel, "update", {
      size: "sm",
      tone: "muted",
      anchor: compact ? "start" : "middle",
      baseline: compact ? "middle" : "bottom"
    }).raw(`</g><g class="ex4-step ex4-step-3">`);

    if (compact) {
      c.arrow({ x: map.x, y: map.y + node.r + 2 }, { x: output.x, y: output.y - box.h / 2 - 2 });
    } else {
      c.arrow({ x: map.x + node.r + 2, y: map.y }, { x: output.x - box.w / 2 - 2, y: output.y });
    }
    c.rect(output.x - box.w / 2, output.y - box.h / 2, box.w, box.h, { tone: 3, radius: 4 }).label(
      output,
      "Output $\\hat{y}$"
    );

    // Feedback: from the output's far side back to the input's, curving
    // below (wide) or to the left (compact).
    const from = compact
      ? { x: output.x - box.w / 2, y: output.y, r: 2 }
      : { x: output.x, y: output.y + box.h / 2, r: 2 };
    const to = compact
      ? { x: input.x - box.w / 2, y: input.y, r: 2 }
      : { x: input.x, y: input.y + box.h / 2, r: 2 };
    const mid = c.edge(from, to, { tone: "neutral", dashed: true, bend: compact ? 35 : 28 });
    c.label(mid, "feedback", { size: "sm", tone: "muted", halo: true }).raw(`</g>`);

    return c;
  }
});
