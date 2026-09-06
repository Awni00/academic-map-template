import { useCallback, useMemo, useState } from "react";

import GraphCanvas from "../components/graph/GraphCanvas";
import { graphNeighborhood } from "../lib/graph/neighborhoods";
import type { DragRelease } from "../lib/graph/nodeDrag";
import type { GraphIndex } from "../lib/graph/types";

const RELEASES: Array<{ id: DragRelease; label: string; note: string }> = [
  {
    id: "keep",
    label: "Stays where dropped",
    note: "The pin survives the drop. Least surprising, but a node parked off the ring stays off it."
  },
  {
    id: "spring",
    label: "Springs back",
    note: "The node returns to whatever pin it had before — none for an ordinary node. Needs a reheat to move at all."
  },
  {
    id: "gesture",
    label: "Stays, releasable",
    note: "Pins like ‘stays’, but double-click hands a node back to the simulation."
  }
];

type Props = {
  graph: GraphIndex;
  anchorId: string;
  hubLayout: "circle" | "row" | "force";
  labelMode: "config" | "all" | "none";
  labelSide: "auto" | "top" | "bottom";
};

export default function NodeDragVariants({
  graph,
  anchorId,
  hubLayout,
  labelMode,
  labelSide
}: Props) {
  const [release, setRelease] = useState<DragRelease>("keep");
  const [reheat, setReheat] = useState(false);
  const [squeezed, setSqueezed] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [pickedBrowser, setPickedBrowser] = useState<string | null>(null);
  const [pickedLocal, setPickedLocal] = useState<string | null>(null);

  // The anchored surface shows a neighbourhood, exactly as LocalGraphMap does.
  const localGraph = useMemo(
    () => graphNeighborhood(graph, anchorId, 1, 20),
    [graph, anchorId]
  );

  const reset = useCallback(() => {
    setGeneration((n) => n + 1);
    setPickedBrowser(null);
    setPickedLocal(null);
  }, []);

  return (
    <div className="nd">
      <div className="nd-controls">
        <fieldset className="nd-group">
          <legend>On release</legend>
          {RELEASES.map((option) => (
            <label className="nd-radio" key={option.id}>
              <input
                type="radio"
                name="release"
                checked={release === option.id}
                onChange={() => setRelease(option.id)}
              />
              <span>
                {option.label}
                <small>{option.note}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="nd-group">
          <legend>After the drop</legend>
          <label className="nd-radio">
            <input type="checkbox" checked={reheat} onChange={(e) => setReheat(e.target.checked)} />
            <span>
              Re-settle the layout
              <small>
                Off, only the dragged node moves. On, everything re-settles — and “springs back”
                does nothing without it, which is worth seeing once.
              </small>
            </span>
          </label>
          <label className="nd-radio">
            <input
              type="checkbox"
              checked={squeezed}
              onChange={(e) => setSqueezed(e.target.checked)}
            />
            <span>
              Squeeze the width
              <small>
                Rebuilds the layout the way a window resize does. A drop that cannot survive this
                cannot survive a reader resizing their window.
              </small>
            </span>
          </label>
          <button type="button" className="nd-reset" onClick={reset}>
            Reset positions
          </button>
        </fieldset>
      </div>

      <section className="nd-cell">
        <h2>
          Writing browser <span className="nd-meta">unanchored · 620px · free layout</span>
        </h2>
        <p className="nd-note">
          A free-form map. Dropping a node somewhere deliberate is arguably the point here.
          Selected: <code>{pickedBrowser ?? "—"}</code> — a small wobble should select, a real drag
          should not.
        </p>
        <div className="nd-canvas" style={{ maxWidth: squeezed ? "62%" : "100%" }}>
          <GraphCanvas
            key={`browser-${generation}`}
            graph={graph}
            height={620}
            selected={pickedBrowser ?? undefined}
            selectedStyle="soft-glow"
            hubLayout={hubLayout}
            labelMode={labelMode}
            labelSide={labelSide}
            onSelect={setPickedBrowser}
            draggable
            dragRelease={release}
            dragReheat={reheat}
          />
        </div>
      </section>

      <section className="nd-cell">
        <h2>
          Local map <span className="nd-meta">anchored · 240px · ring around the current page</span>
        </h2>
        <p className="nd-note">
          The ring radius and the pixels-per-unit are stated inputs here, not outcomes — so a
          dropped node sits visibly off a circle everything else is on. The anchor itself refuses to
          be dragged. Selected: <code>{pickedLocal ?? "—"}</code>
        </p>
        {/* Left to the class at rest, so it keeps the real widget's measure. */}
        <div className="nd-canvas nd-canvas--local" style={squeezed ? { maxWidth: "240px" } : undefined}>
          <div className="local-graph-map__canvas">
            <GraphCanvas
              key={`local-${generation}`}
              graph={localGraph}
              height={240}
              anchor={anchorId}
              selected={pickedLocal ?? anchorId}
              selectedStyle="soft-glow"
              labelMode="none"
              onSelect={setPickedLocal}
              draggable
              dragRelease={release}
              dragReheat={reheat}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
