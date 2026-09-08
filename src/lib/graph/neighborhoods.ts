import { isHubType } from "../../config";
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
  // The centre goes in first. `maxNodes` trims in collection order, so a page
  // with more neighbours than the budget could otherwise have the very node
  // the neighbourhood is built around trimmed away.
  const found = index.nodes.filter((node) => ids.has(node.id));
  const ordered = [
    ...found.filter((node) => node.id === id),
    ...found.filter((node) => node.id !== id)
  ];
  const nodes = ordered.slice(0, maxNodes);
  const allowed = new Set(nodes.map((node) => node.id));
  const edges = index.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
  const linkedFrom: Record<string, string[]> = {};
  const linksTo: Record<string, string[]> = {};
  for (const node of nodes) {
    linkedFrom[node.id] = index.linkedFrom[node.id]?.filter((source) => allowed.has(source)) ?? [];
    linksTo[node.id] = index.linksTo[node.id]?.filter((target) => allowed.has(target)) ?? [];
  }
  return {
    nodes,
    edges,
    linkedFrom,
    linksTo,
    hubs: nodes.filter((node) => isHubType(node.type))
  };
}
