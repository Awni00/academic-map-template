import { useCallback, useMemo, useState } from "react";

import { graphConfig, isHubType } from "../../config";
import type { EntryNode, GraphIndex } from "../../lib/graph/types";
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
          anchor={currentId}
          drag={graphConfig.interaction.drag}
          // Hubs keep their painted names (per `labelVisibility`), so the map
          // says which topics this page belongs to; every other node shows
          // its title on hover.
          labelMode="config"
          placeholder={<MapSkeleton nodes={localGraph.nodes} anchorId={currentId} />}
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

/**
 * What the map shows before the canvas mounts (the server render, and until
 * it scrolls into view): the neighbourhood's shape in faint outline — this
 * page in the middle, one mark per neighbour around it, hubs square — rather
 * than an empty box or a "Loading graph..." line. It has nothing to say to a
 * screen reader that the panel beside it does not.
 */
function MapSkeleton({ nodes, anchorId }: { nodes: EntryNode[]; anchorId: string }) {
  const others = nodes.filter((node) => node.id !== anchorId);
  const cx = 150;
  const cy = 120;
  const points = others.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, others.length) - Math.PI / 2;
    return { node, x: cx + 92 * Math.cos(angle), y: cy + 76 * Math.sin(angle) };
  });
  return (
    <svg className="local-graph-map__skeleton" viewBox="0 0 300 240" aria-hidden="true">
      {points.map(({ node, x, y }) => (
        <line key={`edge-${node.id}`} x1={cx} y1={cy} x2={x} y2={y} />
      ))}
      {points.map(({ node, x, y }) =>
        isHubType(node.type) ? (
          <rect key={node.id} x={x - 6} y={y - 6} width={12} height={12} rx={2} />
        ) : (
          <circle key={node.id} cx={x} cy={y} r={5.5} />
        )
      )}
      <circle className="local-graph-map__skeleton-anchor" cx={cx} cy={cy} r={8} />
    </svg>
  );
}
