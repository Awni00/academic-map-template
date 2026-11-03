/**
 * The hero fixture's variants, as path segments: `key-value` pairs joined by
 * `_`, e.g. `/dev/hero/side-right_len-l`. The route has to enumerate its
 * paths (prerendered pages see no query string, even in dev), so this list is
 * every combination the e2e suite and the visual review use.
 *
 *   side-left|right   w-<px>   shape-rounded|circle|square   sticky-1
 *   photo-none   name-hide   extra-1   custom-1 (adds custom links)
 *   links-<style> (both)   dlinks-<style>   mlinks-<style>   phone-centered|compact
 *   len-s|m|l (bio length)   justify-all|tablet
 */
const sides = ["left", "right"];
const styles = ["pills", "icons", "list", "text", "text-icons"];

export const HERO_FIXTURE_VARIANTS: string[] = [
  "default",
  ...sides.flatMap((side) => [
    `side-${side}`,
    `side-${side}_len-s`,
    `side-${side}_len-l`,
    `side-${side}_phone-compact`,
    `side-${side}_photo-none`,
    `side-${side}_sticky-1_len-l`,
    ...styles.map((style) => `side-${side}_links-${style}`),
    ...styles.map((style) => `side-${side}_links-${style}_phone-compact`)
  ]),
  "len-l_justify-all",
  "len-l_justify-tablet",
  "w-180",
  "w-300",
  "shape-circle",
  "name-hide_extra-1",
  "custom-1",
  "photo-none_phone-compact"
];

export function parseHeroVariant(variant: string): Record<string, string> {
  if (variant === "default") return {};
  return Object.fromEntries(
    variant.split("_").map((part) => {
      const at = part.indexOf("-");
      return [part.slice(0, at), part.slice(at + 1)];
    })
  );
}
