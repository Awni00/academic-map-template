import type { GraphEdge, GraphIndex } from "./types";

export function adjacentIds(edges: GraphEdge[], id: string): string[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.source === id) ids.add(edge.target);
    if (edge.target === id) ids.add(edge.source);
  }
  return [...ids];
}

export function neighborhoodIds(index: GraphIndex, id: string, depth: 1 | 2 = 1): Set<string> {
  const seen = new Set<string>([id]);
  let frontier = new Set<string>([id]);
  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const current of frontier) {
      for (const neighbor of adjacentIds(index.edges, current)) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          next.add(neighbor);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export function graphNeighborhood(index: GraphIndex, id: string, depth: 1 | 2 = 1, maxNodes?: number): GraphIndex {
  const ids = neighborhoodIds(index, id, depth);
  const nodes = index.nodes.filter((node) => ids.has(node.id)).slice(0, maxNodes);
  const allowed = new Set(nodes.map((node) => node.id));
  const edges = index.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
  const backlinks: Record<string, string[]> = {};
  const outgoing: Record<string, string[]> = {};
  for (const node of nodes) {
    backlinks[node.id] = index.backlinks[node.id]?.filter((source) => allowed.has(source)) ?? [];
    outgoing[node.id] = index.outgoing[node.id]?.filter((target) => allowed.has(target)) ?? [];
  }
  return {
    nodes,
    edges,
    backlinks,
    outgoing,
    hubs: nodes.filter((node) => node.type === "hub")
  };
}
