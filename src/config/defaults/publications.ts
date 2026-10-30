import type { PublicationsConfig } from "../types";

export const defaultPublicationsConfig = {
  source: "src/data/publications.bib",
  grouping: {
    by: "year",
    order: "desc"
  },
  authorHighlight: ["Your Name"],
  bibtex: {
    showButtonField: "bibtex_show"
  },
  abstractDisplay: "popup",
  abstractMath: true,
  previews: {
    enabled: true,
    basePath: "/publications"
  }
} as const satisfies PublicationsConfig;
