import { getEntryType } from "../../config";
import type { EntryNode } from "../../lib/graph/types";

type NodeDetailPanelProps = {
  node: EntryNode;
  /**
   * The node is the page being read. Marked as such, and given no open action:
   * a link to the page you are on is a link that does nothing.
   */
  isCurrent?: boolean;
  className?: string;
};

/**
 * The panel beside a small map that describes its selected node: type, title,
 * tags, summary, and the explicit link that opens it.
 *
 * Shared by the per-entry `LocalGraphMap` and the homepage `WritingPreview`, so
 * both miniatures describe a node the same way and teach the same interaction:
 * a click on the canvas selects, and only this panel's action navigates. The
 * container owns the panel's size; the panel owns what goes in it.
 */
export default function NodeDetailPanel({ node, isCurrent = false, className }: NodeDetailPanelProps) {
  const type = getEntryType(node.type);

  return (
    <div
      className={className ? `node-panel ${className}` : "node-panel"}
      // Ties the panel to the node it describes, not merely to the map: the
      // edge takes the selected type's colour and changes with it.
      style={{ ["--map-accent" as string]: type.graph.color }}
    >
      <div className="node-panel__meta">
        <span className="pill" style={{ ["--pill-color" as string]: type.graph.color }}>
          {type.label}
        </span>
        {isCurrent && <span className="node-panel__here">This page</span>}
      </div>
      {/*
        Not a heading. On an entry page its text starts as — and often is — the
        page's own <h1>, so a heading here puts the same title in the outline
        twice. It labels a panel that changes on click, which is not page
        structure.
      */}
      <p className="node-panel__title">{node.title}</p>
      {node.tags.length > 0 && (
        <div className="node-panel__tags">
          {node.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
      {node.summary && <p className="node-panel__summary">{node.summary}</p>}
      {!isCurrent && (
        <a className="node-panel__open" href={node.url}>
          <span>Open page</span>
          <span className="node-panel__open-arrow" aria-hidden="true">
            →
          </span>
        </a>
      )}
    </div>
  );
}
