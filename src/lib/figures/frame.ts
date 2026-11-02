import { FIGURE_COMPACT_WIDTH, FIGURE_SIZES, type FigureSize } from "./index";

/**
 * What `<Chart>` and `<Diagram>` share before they draw: finding a
 * definition by id, and working out the widths to draw it at.
 */

/**
 * The default export of `<root>/<id>.ts` among `modules` (an eager
 * `import.meta.glob`), or a build error naming the file that is missing.
 */
export function findDefinition<T>(
  modules: Record<string, { default: T }>,
  root: string,
  id: string,
  component: string
): T {
  const definition = modules[`/${root}/${id}.ts`]?.default;
  if (!definition) throw new Error(`<${component}>: no definition at ${root}/${id}.ts`);
  return definition;
}

export type FigureLayout = {
  size: FigureSize;
  /** The width the figure is drawn at, and its maximum display width. */
  width: number;
  /**
   * The phone layout's width, or null for a narrow figure, which already fits
   * a phone column. A medium or full figure is drawn again at this width and
   * swapped in on narrow columns, rather than shrinking its type.
   */
  compactWidth: number | null;
};

export function figureLayout(size: FigureSize): FigureLayout {
  return {
    size,
    width: FIGURE_SIZES[size],
    compactWidth: size === "narrow" ? null : FIGURE_COMPACT_WIDTH
  };
}
