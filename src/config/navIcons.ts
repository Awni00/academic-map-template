/**
 * Icon names a nav item may use (`site.nav[].icon`), shown beside each label
 * in the phone menu. They are Lucide names (https://lucide.dev/icons).
 *
 * A curated list rather than all of Lucide, so the dev server never loads a
 * thousand icon modules to draw six. To add one: append its name here and its
 * component in `src/components/layout/navIcons.ts`; the shared type keeps the
 * two in step.
 */
export const navIconNames = [
  "house",
  "user",
  "waypoints",
  "pen-line",
  "notebook-pen",
  "newspaper",
  "book-open",
  "library",
  "flask-conical",
  "graduation-cap",
  "presentation",
  "mic",
  "briefcase",
  "folder-open",
  "code",
  "file-text",
  "calendar",
  "mail",
  "globe",
  "rss"
] as const;

export type NavIconName = (typeof navIconNames)[number];

export function isNavIconName(name: string): name is NavIconName {
  return (navIconNames as readonly string[]).includes(name);
}
