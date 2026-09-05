import { useMemo } from "react";

import { graphNeighborhood } from "../../lib/graph/neighborhoods";
import type { GraphIndex } from "../../lib/graph/types";

/**
 * The depth-1 neighbourhood around one entry, memoised.
 *
 * Shared so the header and footer maps cannot disagree about what a
 * neighbourhood is — they were computing it separately with the same
 * arguments, which is how they drifted apart in the first place.
 *
 * Lives here rather than in `lib/graph` because it is a hook, and `src/lib` is
 * React-free.
 */
export function useNeighborhood(
  graph: GraphIndex,
  currentId: string,
  depth: 1 | 2 = 1,
  maxNodes = 20
): GraphIndex {
  return useMemo(
    () => graphNeighborhood(graph, currentId, depth, maxNodes),
    [graph, currentId, depth, maxNodes]
  );
}
