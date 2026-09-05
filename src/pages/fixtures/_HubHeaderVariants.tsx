import { useCallback, useMemo, useState } from "react";

import type { FrameInfo } from "../../components/graph/GraphCanvas";
import LocalGraphMap, { type MapPanel } from "../../components/graph/LocalGraphMap";
import type { GraphIndex } from "../../lib/graph/types";

/** One real header-placement entry, resolved on the server. */
export type HubCase = {
  id: string;
  title: string;
  neighbours: number;
  depth: 1 | 2;
  /** Overrides the shared index — used only by the synthetic crowding case. */
  graph?: GraphIndex;
  /** Rendered as a warning, so a made-up neighbourhood can't be mistaken. */
  synthetic?: string;
};

type Variant = {
  id: string;
  panel: MapPanel;
  label: string;
  note: string;
  height: number;
};

const VARIANTS: Variant[] = [
  {
    id: "bare",
    panel: "none",
    label: "A — bare",
    note: "Canvas alone, capped measure. Today's shape, but anchored and fixed-scale.",
    height: 220
  },
  {
    id: "full",
    panel: "full",
    label: "B — full panel",
    note: "The footer map unchanged: type, title, tags, summary, and an action to open.",
    height: 240
  },
  {
    id: "compact",
    panel: "compact",
    label: "C — compact panel",
    note: "Type and title only. Enough to identify a node, not enough to read it.",
    height: 220
  }
];

type Report = FrameInfo & { caseKey: string; variantId: string };

/** Entry and depth together — the depth-2 stress row is the same entry. */
const caseKeyOf = (hub: HubCase) => `${hub.id}@${hub.depth}${hub.synthetic ? "@synthetic" : ""}`;

function Cell({
  hub,
  graph,
  variant,
  boxed,
  onReport
}: {
  hub: HubCase;
  graph: GraphIndex;
  variant: Variant;
  boxed: boolean;
  onReport: (report: Report) => void;
}) {
  const caseKey = caseKeyOf(hub);
  const handleFrame = useCallback(
    (info: FrameInfo) => onReport({ ...info, caseKey, variantId: variant.id }),
    [caseKey, variant.id, onReport]
  );
  return (
    <figure className="hv-cell">
      <figcaption>
        <span className="hv-cell__label">{variant.label}</span>
        <span className="hv-cell__note">{variant.note}</span>
      </figcaption>
      {/* The real slot: 760px wide, with the header's own margin above it. */}
      <div className="hv-slot">
        <LocalGraphMap
          key={`${caseKey}-${variant.id}-${boxed}`}
          graph={hub.graph ?? graph}
          currentId={hub.id}
          depth={hub.depth}
          height={variant.height}
          panel={variant.panel}
          boxed={boxed}
          onFrame={handleFrame}
        />
      </div>
    </figure>
  );
}

export default function HubHeaderVariants({
  graph,
  cases
}: {
  graph: GraphIndex;
  cases: HubCase[];
}) {
  const [boxed, setBoxed] = useState(false);
  const [reports, setReports] = useState<Record<string, Report>>({});

  const onReport = useCallback((report: Report) => {
    const key = `${report.caseKey}::${report.variantId}`;
    setReports((previous) => {
      const existing = previous[key];
      if (
        existing &&
        Math.abs(existing.anchorGlyphPx - report.anchorGlyphPx) < 0.05 &&
        Math.abs(existing.achievedRadius - report.achievedRadius) < 0.5
      ) {
        return previous;
      }
      return { ...previous, [key]: report };
    });
  }, []);

  const rows = useMemo(
    () =>
      cases.flatMap((hub) =>
        VARIANTS.map((variant) => ({
          hub,
          variant,
          report: reports[`${caseKeyOf(hub)}::${variant.id}`]
        }))
      ),
    [cases, reports]
  );

  // The invariant is that `zoom` holds at the stated scale — NOT that every
  // anchor is painted the same size. A hub glyph (type size 18) is legitimately
  // larger than a sub-hub's (10); comparing those directly would report a
  // violation where the type palette is simply doing its job.
  // The headline is about real entries. The synthetic case exists to be
  // crowded, so folding it in would report its deliberate degradation as a
  // failure of the thing it was built to demonstrate.
  const real = rows.filter((row) => !row.hub.synthetic);
  const measured = real.map((row) => row.report).filter((r): r is Report => r != null);
  const zooms = measured.map((r) => r.zoom);
  const spread = zooms.length ? Math.max(...zooms) / Math.min(...zooms) : 0;
  const holds = spread > 0 && spread < 1.001;
  const degraded = measured.filter((r) => r.zoom < r.scaleTarget - 1e-6).length;
  const stressed = rows
    .filter((row) => row.hub.synthetic && row.report)
    .map((row) => row.report as Report);
  const byType = new Map<number, number>();
  for (const report of measured) {
    byType.set(report.anchorGlyphPx, (byType.get(report.anchorGlyphPx) ?? 0) + 1);
  }

  return (
    <div className="hv">
      <div className="hv-controls">
        <label className="hv-toggle">
          <input type="checkbox" checked={boxed} onChange={(e) => setBoxed(e.target.checked)} />
          <span>
            Boxed canvas
            <small>
              graph.css calls the local map “deliberately unboxed”. This is the departure.
            </small>
          </span>
        </label>
        <p className="hv-hint">
          Theme follows the site toggle in the header — check both, since the hub glyph inverts.
        </p>
      </div>

      <div className={`hv-verdict${holds ? " is-good" : ""}`}>
        <div className="hv-verdict__figure">{spread ? `${spread.toFixed(2)}×` : "—"}</div>
        <div className="hv-verdict__body">
          <strong>Applied scale spread across the real entries</strong>
          <span>
            {measured.length
              ? `${measured.length} of ${real.length} cells measured, ${degraded} below the stated scale. Anchor glyphs: ${[
                  ...byType.entries()
                ]
                  .sort((a, b) => b[0] - a[0])
                  .map(([px, count]) => `${px.toFixed(1)}px ×${count}`)
                  .join(", ")}`
              : "measuring…"}
            . 1.00× means every cell got the scale it asked for; glyph sizes differ only by node
            type, which is the palette working, not a violation.
            {stressed.length > 0 && (
              <>
                {" "}
                The synthetic crowded case is excluded and degrades on purpose — ring grown{" "}
                {Math.max(...stressed.map((r) => r.growth)).toFixed(2)}×, scale down to{" "}
                {Math.min(...stressed.map((r) => r.zoom / r.scaleTarget)).toFixed(2)} — which is the
                permitted order: grow the ring first, give up scale last.
              </>
            )}
          </span>
        </div>
      </div>

      <table className="hv-table">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Variant</th>
            <th>n</th>
            <th>zoom</th>
            <th>zoom / scale</th>
            <th>hub glyph</th>
            <th>growth</th>
            <th>achieved / target r</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ hub, variant, report }) => (
            <tr key={`${caseKeyOf(hub)}-${variant.id}`}>
              <td>
                {hub.title}
                {hub.depth === 2 && <span className="hv-stress"> depth 2</span>}
                {hub.synthetic && <span className="hv-stress"> synthetic</span>}
              </td>
              <td>{variant.label}</td>
              <td>{report ? report.neighbourCount : "—"}</td>
              <td>{report ? report.zoom.toFixed(2) : "—"}</td>
              <td className={report && report.zoom < report.scaleTarget - 1e-6 ? "is-degraded" : ""}>
                {report ? (report.zoom / report.scaleTarget).toFixed(2) : "—"}
              </td>
              <td>{report ? `${report.anchorGlyphPx.toFixed(1)}px` : "—"}</td>
              <td className={report && report.growth > 1.001 ? "is-degraded" : ""}>
                {report ? report.growth.toFixed(2) : "—"}
              </td>
              <td>
                {report
                  ? `${report.achievedRadius.toFixed(0)} / ${report.ringRadius.toFixed(0)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cases.map((hub) => (
        <section className="hv-group" key={caseKeyOf(hub)}>
          <h2>
            {hub.title}
            <span className="hv-group__meta">
              {hub.neighbours} neighbour{hub.neighbours === 1 ? "" : "s"}
              {hub.depth === 2 && " · depth 2 (stress)"}
              {hub.synthetic && ` · ${hub.synthetic}`}
            </span>
          </h2>
          {VARIANTS.map((variant) => (
            <Cell
              key={variant.id}
              hub={hub}
              graph={graph}
              variant={variant}
              boxed={boxed}
              onReport={onReport}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
