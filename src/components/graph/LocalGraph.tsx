import { useMemo } from "react";

import { graphNeighborhood } from "../../lib/graph/neighborhoods";
import type { GraphIndex } from "../../lib/graph/types";
import GraphCanvas from "./GraphCanvas";

type LocalGraphProps = {
  graph: GraphIndex;
  currentId: string;
  depth?: 1 | 2;
  maxNodes?: number;
};

export default function LocalGraph({ graph, currentId, depth = 1, maxNodes = 20 }: LocalGraphProps) {
  const localGraph = useMemo(() => graphNeighborhood(graph, currentId, depth, maxNodes), [
    currentId,
    depth,
    graph,
    maxNodes
  ]);
  const highlighted = useMemo(() => new Set([currentId]), [currentId]);
  return (
    <div className="local-graph">
      <GraphCanvas
        graph={localGraph}
        height={190}
        selected={currentId}
        highlighted={highlighted}
        selectedStyle="soft-glow"
        labelMode="none"
      />
    </div>
  );
}
