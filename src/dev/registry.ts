/**
 * Every dev page, in one list: the route (src/pages/dev/[...page].astro)
 * reads its paths and components from here, and the /dev index reads its
 * links. Adding a page means adding one entry.
 *
 * Two kinds of page share the route. Tools are for the person running the
 * site — choosing a theme, tuning the graph, reviewing figures. Fixtures are
 * for the e2e suite: components at known props, so Playwright can measure
 * real layout. (The tools are tested too; the split is about who opens them.)
 *
 * An entry with no `component` has a route of its own and is only listed
 * here; `variants` are its path segments under /dev/<slug>/.
 */
import ArticleLayout from "./ArticleLayout.astro";
import FigureReview from "./FigureReview.astro";
import GraphPlayground from "./GraphPlayground.astro";
import { HERO_FIXTURE_VARIANTS } from "./heroVariants";
import HoverPopovers from "./HoverPopovers.astro";
import MediaLayoutControls from "./MediaLayoutControls.astro";
import ThemeGallery from "./ThemeGallery.astro";

export type DevPageGroup = "tool" | "fixture";

type DevPageInfo = {
  slug: string;
  title: string;
  description: string;
  group: DevPageGroup;
  component?: unknown;
  variants?: readonly string[];
};

export const DEV_PAGES = [
  {
    slug: "themes",
    title: "Theme gallery",
    description:
      "Every registered theme side by side, with contrast checks, for choosing theme.light and theme.dark.",
    group: "tool",
    component: ThemeGallery,
  },
  {
    slug: "graph-playground",
    title: "Graph playground",
    description:
      "The writing map as configured beside one driven by controls, with the changed settings written out as config.",
    group: "tool",
    component: GraphPlayground,
  },
  {
    slug: "figures",
    title: "Figure review",
    description:
      "Every figure listed in src/site/figure-review/, and how redrawn ones looked before.",
    group: "tool",
    component: FigureReview,
  },
  {
    slug: "article-layout",
    title: "Article layout",
    description:
      "A paper page with a synthetic entry and each article component in configurations that have broken before.",
    group: "fixture",
    component: ArticleLayout,
  },
  {
    slug: "hero",
    title: "Homepage hero",
    description:
      "The hero at each photo side, width, bio length and link style.",
    group: "fixture",
    variants: HERO_FIXTURE_VARIANTS,
  },
  {
    slug: "hover-popovers",
    title: "Hover popovers",
    description:
      "HoverNote and Term popovers, including wrapped, inverted and linked terms.",
    group: "fixture",
    component: HoverPopovers,
  },
  {
    slug: "media-layout-controls",
    title: "Media layout controls",
    description:
      "Width, alignment and grid controls on figures, pictures and embeds.",
    group: "fixture",
    component: MediaLayoutControls,
  },
] as const satisfies readonly DevPageInfo[];

export type DevPage = (typeof DEV_PAGES)[number];

/** The pages [...page].astro renders itself. */
export const ROUTED_DEV_PAGES = DEV_PAGES.filter(
  (page): page is Extract<DevPage, { component: unknown }> =>
    "component" in page,
);
