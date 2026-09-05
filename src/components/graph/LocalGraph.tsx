import { useMemo } from "react";

import type { GraphIndex } from "../../lib/graph/types";
import GraphCanvas from "./GraphCanvas";
import { useNeighborhood } from "./useNeighborhood";

type LocalGraphProps = {
  graph: GraphIndex;
  currentId: string;
  depth?: 1 | 2;
  maxNodes?: number;
  height?: number;
};

export default function LocalGraph({
  graph,
  currentId,
  depth = 1,
  maxNodes = 20,
  height = 190
}: LocalGraphProps) {
  const localGraph = useNeighborhood(graph, currentId, depth, maxNodes);
  const highlighted = useMemo(() => new Set([currentId]), [currentId]);
  return (
    <div className="local-graph" style={{ ["--local-graph-height" as string]: `${height}px` }}>
      <GraphCanvas
        graph={localGraph}
        height={height}
        selected={currentId}
        highlighted={highlighted}
        selectedStyle="soft-glow"
        labelMode="none"
      />
    </div>
  );
}
