import { isHubType, isSectionType } from "../../config";
import type { EntryType } from "../../config";

/**
 * The "cluster" layout for the writing map: every entry gathers around the hub
 * whose folder it lives in, and the hubs find their own places.
 *
 * The folder tree is the one piece of structure every site already states, and
 * it is the one a reader is looking for on the map: which pages belong
 * together. Links alone cannot say it. They cross between topics as often as
 * they stay inside one, so a layout driven only by links lets a hub's own
 * entries drift to whichever neighbour they happen to cite. The pull here is
 * toward the parent folder, with the links left to arrange things inside and
 * between the groups.
 *
 * Everything in this module is plain arithmetic over node objects, so the
 * forces can be tested without a canvas or a simulation.
 */

type FolderNode = { id: string; path: string; type: EntryType };
type SimNode = { id: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null };

/** Whether a type can hold other pages: hubs, and sub-hubs ("section" role). */
export function isContainerType(type: EntryType): boolean {
  return isHubType(type) || isSectionType(type);
}

/**
 * Each node's nearest containing hub or sub-hub, by folder path. Top-level hubs,
 * and pages that sit in no hub's folder, have no entry.
 */
export function parentHubs(nodes: readonly FolderNode[]): Map<string, string> {
  const containers = new Map(
    nodes.filter((node) => isContainerType(node.type)).map((node) => [node.path, node.id])
  );
  const parents = new Map<string, string>();
  for (const node of nodes) {
    const parts = node.path.split("/");
    for (let end = parts.length - 1; end > 0; end -= 1) {
      const parent = containers.get(parts.slice(0, end).join("/"));
      if (parent && parent !== node.id) {
        parents.set(node.id, parent);
        break;
      }
    }
  }
  return parents;
}

/**
 * How many pages sit under each top-level hub, at any depth. The panel lists a
 * hub with this count, so a reader can tell a large topic from a small one
 * before opening either.
 */
export function hubMemberCounts(nodes: readonly FolderNode[]): Map<string, number> {
  const parents = parentHubs(nodes);
  const counts = new Map<string, number>();
  for (const node of nodes) {
    let top: string | undefined;
    for (let up = parents.get(node.id); up; up = parents.get(up)) top = up;
    if (top) counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return counts;
}

/**
 * Starting positions: top-level groups evenly round a circle, members scattered
 * near their parent. Deterministic, because a seeded generator replaces
 * `Math.random` — the map should open on the same picture every visit, not a
 * new arrangement of the same graph.
 */
export function seedPositions(
  nodes: readonly FolderNode[],
  parents: Map<string, string>,
  radius = 140
): Map<string, { x: number; y: number }> {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out = new Map<string, { x: number; y: number }>();
  const tops = nodes.filter((node) => !parents.has(node.id));
  tops.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(1, tops.length) - Math.PI / 2;
    out.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  const place = (id: string, depth = 0): { x: number; y: number } => {
    const known = out.get(id);
    if (known) return known;
    const parent = parents.get(id);
    // A cycle cannot come from a folder tree, but the guard costs nothing.
    const anchor = parent && depth < 32 ? place(parent, depth + 1) : { x: 0, y: 0 };
    const position = { x: anchor.x + (random() - 0.5) * 60, y: anchor.y + (random() - 0.5) * 60 };
    out.set(id, position);
    return position;
  };
  for (const node of nodes) place(node.id);
  return out;
}

/**
 * Pull each node toward its parent hub, holding it about `distance` away, with
 * a lighter pull back on the parent so a group moves as one.
 *
 * Pinned nodes (a reader's drop) are not moved, but still pull their members.
 */
export function clusterForce(parents: Map<string, string>, distance: number, strength: number) {
  let byId = new Map<string, SimNode>();
  const force = (alpha: number) => {
    for (const [childId, parentId] of parents) {
      const child = byId.get(childId);
      const parent = byId.get(parentId);
      if (!child || !parent) continue;
      const dx = (parent.x ?? 0) - (child.x ?? 0);
      const dy = (parent.y ?? 0) - (child.y ?? 0);
      const d = Math.hypot(dx, dy) || 1e-6;
      const k = ((d - distance) / d) * strength * alpha;
      if (child.fx == null) {
        child.vx = (child.vx ?? 0) + dx * k;
        child.vy = (child.vy ?? 0) + dy * k;
      }
      if (parent.fx == null) {
        parent.vx = (parent.vx ?? 0) - dx * k * 0.25;
        parent.vy = (parent.vy ?? 0) - dy * k * 0.25;
      }
    }
  };
  force.initialize = (nodes: SimNode[]) => {
    byId = new Map(nodes.map((node) => [node.id, node]));
  };
  return force;
}

/**
 * A gentle pull of every node toward the origin, stronger across the canvas's
 * short side.
 *
 * Replaces d3's centring force, which translates the whole layout rigidly and so
 * does nothing to stop a disconnected group drifting off into a corner. Pulling
 * each node keeps separate groups near one another, and weakening the pull
 * along the long axis lets the layout take the canvas's shape rather than a
 * circle's.
 */
export function centerForce(strength: number, aspect: number) {
  let nodes: SimNode[] = [];
  const kx = strength * Math.min(1, 1 / aspect);
  const ky = strength * Math.min(1, aspect);
  const force = (alpha: number) => {
    for (const node of nodes) {
      if (node.fx != null) continue;
      node.vx = (node.vx ?? 0) - (node.x ?? 0) * kx * alpha;
      node.vy = (node.vy ?? 0) - (node.y ?? 0) * ky * alpha;
    }
  };
  force.initialize = (initial: SimNode[]) => {
    nodes = initial;
  };
  return force;
}
