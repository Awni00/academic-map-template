import { useCallback, useMemo, useState } from "react";

import { graphConfig } from "../../config";
import type { GraphIndex } from "../../lib/graph/types";
import GraphCanvas from "./GraphCanvas";
import NodeDetailPanel from "./NodeDetailPanel";
import { useNeighborhood } from "./useNeighborhood";

type LocalGraphMapProps = {
  graph: GraphIndex;
  currentId: string;
  depth?: 1 | 2;
  maxNodes?: number;
  height?: number;
};

/**
 * A miniature of the writing map: the neighbourhood canvas beside a panel
 * describing whatever node is selected.
 *
 * The division of labour matters. Clicking a node *selects* it — it does not
 * navigate — because a canvas click that silently changes the page is a
 * surprise, and because selection is what lets a reader inspect several
 * neighbours without leaving the page they are on. Navigation is always an
 * explicit link: the action at the foot of the panel. This mirrors how the
 * full GraphBrowser behaves, so the small widget and the large map teach the
 * same interaction.
 *
 * It is also bounded whatever a page's degree: the canvas caps its
 * neighbourhood at `maxNodes` and the panel is sized to the canvas, so a
 * heavily linked page cannot stretch the footer.
 */
export default function LocalGraphMap({
  graph,
  currentId,
  depth = 1,
  maxNodes = 20,
  height = 240
}: LocalGraphMapProps) {
  const localGraph = useNeighborhood(graph, currentId, depth, maxNodes);
  // Selection starts on the page you are reading, so the panel is never empty
  // and the first thing described is the thing you already have context for.
  const [selectedId, setSelectedId] = useState(currentId);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  const selected = byId.get(selectedId) ?? byId.get(currentId);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className="local-graph-map" style={{ ["--map-height" as string]: `${height}px` }}>
      <div className="local-graph-map__canvas">
        <GraphCanvas
          graph={localGraph}
          height={height}
          selected={selectedId}
          selectedStyle="soft-glow"
          anchor={currentId}
          drag={graphConfig.interaction.drag}
          labelMode="none"
          onSelect={handleSelect}
        />
      </div>
      {selected && (
        <NodeDetailPanel
          node={selected}
          isCurrent={selected.id === currentId}
          className="local-graph-map__side"
        />
      )}
    </div>
  );
}
