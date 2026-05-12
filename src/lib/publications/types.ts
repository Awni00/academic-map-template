export type Publication = {
  id: string;
  type: string;
  title: string;
  author: string;
  authors: string[];
  year: string;
  venue?: string;
  abstract?: string;
  abbr?: string;
  doi?: string;
  url?: string;
  arxiv?: string;
  html?: string;
  pdf?: string;
  code?: string;
  blog?: string;
  slides?: string;
  poster?: string;
  video?: string;
  website?: string;
  preview?: string;
  selected: boolean;
  bibtexShow: boolean;
  raw: string;
  fields: Record<string, string>;
};

export type PublicationGroup = {
  label: string;
  publications: Publication[];
};
