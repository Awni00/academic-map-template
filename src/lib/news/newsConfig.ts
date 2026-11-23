import type { NewsPlacement, SiteConfig } from "../../config/types";
import type { ConfigIssues } from "../home/hero";

export const NEWS_PLACEMENTS: readonly NewsPlacement[] = ["beside-publications", "below-publications"];

/** Problems with `site.homepage.news`. */
export function validateNewsConfig(news: SiteConfig["homepage"]["news"]): ConfigIssues {
  const errors: string[] = [];
  if (!NEWS_PLACEMENTS.includes(news?.placement)) {
    errors.push(
      `site.homepage.news.placement is ${JSON.stringify(news?.placement)}; expected ${NEWS_PLACEMENTS.map((value) => `"${value}"`).join(" or ")}.`
    );
  }
  return { errors, warnings: [] };
}
