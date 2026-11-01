import { getEntryType, type EntryType } from "../../../config";
import NodeIcon, { type NodeShape } from "../NodeIcon";

/**
 * An entry type as the browser names it everywhere: the glyph the map draws
 * for it, then its label. The legend, the filters, the rows and the panel all
 * use this one mark, so a type looks the same wherever it is read.
 */
export default function TypeLabel({ type, className }: { type: EntryType; className?: string }) {
  const entryType = getEntryType(type);
  return (
    <span className={className ? `wb-type ${className}` : "wb-type"}>
      <NodeIcon shape={entryType.graph.shape as NodeShape} color={entryType.graph.color as string} />
      {entryType.label}
    </span>
  );
}
