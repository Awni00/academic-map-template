export const publicationsConfig = {
  source: "src/data/publications.bib",
  grouping: {
    by: "year",
    order: "desc"
  },
  authorHighlight: ["Your Name"],
  bibtex: {
    showButtonField: "bibtex_show"
  },
  previews: {
    enabled: true,
    basePath: "/publications"
  }
} as const;
