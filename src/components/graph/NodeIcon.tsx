export type NodeShape = "square" | "circle" | "diamond" | "hexagon";

/** A node's glyph at legend size, for lists that name nodes beside the map. */
export default function NodeIcon({ shape, color }: { shape: NodeShape; color: string }) {
  // Inline SVG so the legend mirrors the actual node glyphs drawn on the
  // canvas (not just colored dots).
  const props = {
    width: 12,
    height: 12,
    viewBox: "-6 -6 12 12",
    "aria-hidden": true,
    className: "graph-legend-icon",
    style: { color, fill: color }
  } as const;
  switch (shape) {
    case "square":
      return (
        <svg {...props}>
          {/* Corners as rounded as the canvas glyph's (0.36 of the radius). */}
          <rect x={-4} y={-4} width={8} height={8} rx={1.45} />
        </svg>
      );
    case "diamond":
      return (
        <svg {...props}>
          <polygon points="0,-5 5,0 0,5 -5,0" />
        </svg>
      );
    case "hexagon": {
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return `${Math.cos(angle) * 5},${Math.sin(angle) * 5}`;
      }).join(" ");
      return (
        <svg {...props}>
          <polygon points={points} />
        </svg>
      );
    }
    case "circle":
    default:
      return (
        <svg {...props}>
          <circle cx={0} cy={0} r={4.5} />
        </svg>
      );
  }
}
