import { defaultEntryTypes } from "./defaults/entryTypes";
import { defaultGraphConfig } from "./defaults/graph";
import { defaultPublicationsConfig } from "./defaults/publications";
import { defaultSiteConfig } from "./defaults/site";
import { defaultThemeConfig } from "./defaults/theme";
import { builtInThemes } from "./defaults/themes";
import { defaultWritingConfig } from "./defaults/writing";
import { siteConfigOverrides } from "../site/config";
import { customThemes } from "../site/themes";
import { defineTheme } from "../lib/theme/defineTheme";
import { normalizeTocConfig } from "../lib/article/toc";
import { validateJustifyConfig } from "../lib/article/justify";
import { validateGraphSettings } from "../lib/graph/graphSettings";
import { validateRobotsDisallow } from "../lib/meta/robots";
import {
  missingHeroLinkKeys,
  normalizeHeroConfig,
  textMeasureWarning,
  validateLayoutConfig,
  validateSiteLinks
} from "../lib/home/hero";
import type {
  ArticleMode,
  AsidePlacement,
  DeepPartial,
  EntryType,
  EntryTypeDefinition,
  EntryTypeGraphConfig,
  GraphConfig,
  GraphConfigBase,
  PublicationsConfig,
  SiteConfig,
  Theme,
  PlacementOverride,
  ThemeConfig,
  ThemeInput,
  TocConfigOverride,
  WritingConfig
} from "./types";

const fallbackGraph: EntryTypeGraphConfig = {
  shape: "circle",
  size: 9,
  color: "var(--graph-note)",
  labelVisibility: "hover"
};

const fallbackEntryType: EntryTypeDefinition = {
  id: "entry",
  label: "Entry",
  role: "entry",
  ownsFolder: false,
  includeInRss: true,
  includeInRecent: true,
  graph: fallbackGraph
};

export const entryTypeDefinitions = validateEntryTypes(
  siteConfigOverrides.entryTypes ?? defaultEntryTypes
);

const entryTypeById = new Map(entryTypeDefinitions.map((entryType) => [entryType.id, entryType]));

export const entryTypeIds = entryTypeDefinitions.map((entryType) => entryType.id);

const mergedSiteConfig = mergeConfig<SiteConfig>(defaultSiteConfig, siteConfigOverrides.site);
const heroResult = normalizeHeroConfig(mergedSiteConfig.homepage.hero);

export const siteConfig: SiteConfig = {
  ...mergedSiteConfig,
  homepage: { ...mergedSiteConfig.homepage, hero: heroResult.hero }
};
export const themeConfig = mergeConfig<ThemeConfig>(defaultThemeConfig, siteConfigOverrides.theme);

/**
 * Non-fatal config problems, reported by `npm run validate`. Fatal ones throw
 * here instead, so `astro build` and the dev server stop on them too.
 */
export const configWarnings: readonly string[] = checkPresentationConfig();

function checkPresentationConfig(): string[] {
  const links = siteConfig.links as Record<string, unknown>;
  const issues = [
    heroResult,
    validateSiteLinks(links),
    validateRobotsDisallow(siteConfig.robots.disallow),
    validateLayoutConfig(themeConfig.layout),
    validateJustifyConfig(themeConfig.typography.justify)
  ];
  const errors = issues.flatMap((issue) => issue.errors);
  if (errors.length > 0) {
    throw new Error(`Invalid site config:\n  - ${errors.join("\n  - ")}`);
  }

  const warnings = issues.flatMap((issue) => issue.warnings);
  const hero = siteConfig.homepage.hero;
  if (siteConfigOverrides.site?.homepage?.hero?.links?.show) {
    for (const key of missingHeroLinkKeys(hero.links.show, links)) {
      warnings.push(`site.homepage.hero.links.show lists "${key}", but site.links has no "${key}" entry; it is skipped.`);
    }
  }
  if (hero.enabled) {
    const measure = textMeasureWarning(themeConfig.layout.contentWidth, hero.photo.width);
    if (measure) warnings.push(measure);
  }
  return warnings;
}

/**
 * Every theme the site can use, built-ins first. A site theme sharing an id
 * with a built-in replaces it, so `src/site/themes.ts` can retune a shipped
 * theme without the site forking `src/config/defaults/themes.ts`.
 */
export function buildThemeRegistry(
  builtIns: readonly Theme[],
  custom: readonly ThemeInput[]
): ReadonlyMap<string, Theme> {
  return new Map([...builtIns, ...custom.map(defineTheme)].map((theme) => [theme.id, theme]));
}

export const themeRegistry = buildThemeRegistry(builtInThemes, customThemes);

export const lightTheme = resolveTheme(themeConfig.light, "light");
export const darkTheme = resolveTheme(themeConfig.dark, "dark");

function resolveTheme(id: string, slot: "light" | "dark"): Theme {
  const theme = themeRegistry.get(id);
  if (!theme) {
    const available = [...themeRegistry.keys()].sort().join(", ");
    throw new Error(
      `theme.${slot} is "${id}", which is not a known theme. Available themes: ${available}.`
    );
  }
  if (theme.appearance !== slot) {
    throw new Error(
      `theme.${slot} is "${id}", but that theme declares appearance "${theme.appearance}".`
    );
  }
  return theme;
}
export const publicationsConfig = mergeConfig<PublicationsConfig>(
  defaultPublicationsConfig,
  siteConfigOverrides.publications
);

const mergedGraphConfig = mergeConfig<GraphConfigBase>(defaultGraphConfig, siteConfigOverrides.graph);
export const graphConfig: GraphConfig = {
  ...mergedGraphConfig,
  nodeTypes: Object.fromEntries(
    entryTypeDefinitions.map((entryType) => [entryType.id, entryType.graph])
  )
};

export const writingConfig: WritingConfig = resolveWritingConfig();

const graphErrors = validateGraphSettings(
  mergedGraphConfig,
  siteConfig.homepage.writingPreview.hover,
  writingConfig.entryLayout.localGraph.hover
);
if (graphErrors.length > 0) {
  throw new Error(`Invalid graph config:\n  - ${graphErrors.join("\n  - ")}`);
}

export function getEntryType(type: EntryType): EntryTypeDefinition {
  return entryTypeById.get(type) ?? {
    ...fallbackEntryType,
    id: type,
    label: type,
    graph: fallbackGraph
  };
}

export function getEntryTypeLabel(type: EntryType): string {
  return getEntryType(type).label;
}

export function isHubType(type: EntryType): boolean {
  return getEntryType(type).role === "hub";
}

export function isSectionType(type: EntryType): boolean {
  return getEntryType(type).role === "section";
}

export function entryTypeOwnsFolder(type: EntryType): boolean {
  return getEntryType(type).ownsFolder === true;
}

export function entryTypeIncludedInRss(type: EntryType): boolean {
  const definition = getEntryType(type);
  return definition.includeInRss ?? definition.role === "entry";
}

export function entryTypeIncludedInRecent(type: EntryType): boolean {
  const definition = getEntryType(type);
  return definition.includeInRecent ?? definition.role === "entry";
}

function resolveWritingConfig(): WritingConfig {
  const base = mergeConfig<WritingConfig>(
    defaultWritingConfig,
    siteConfigOverrides.writing as DeepPartial<WritingConfig> | undefined
  );
  const modeByType: Record<EntryType, ArticleMode> = {};
  const placementByType: WritingConfig["entryLayout"]["placement"]["byType"] = {};
  const asidesByType: Record<EntryType, AsidePlacement> = {};
  const tocByType: Record<EntryType, TocConfigOverride> = {};
  const rssIncludeTypes: EntryType[] = [];
  const rssExcludeTypes: EntryType[] = [];

  for (const entryType of entryTypeDefinitions) {
    modeByType[entryType.id] = entryType.article?.mode ?? base.entryLayout.mode.default;
    if (entryType.article?.placement) placementByType[entryType.id] = entryType.article.placement;
    asidesByType[entryType.id] = entryType.article?.asides ?? base.entryLayout.asides.default;
    if (entryType.article?.toc) tocByType[entryType.id] = entryType.article.toc;

    if (entryTypeIncludedInRss(entryType.id)) rssIncludeTypes.push(entryType.id);
    else rssExcludeTypes.push(entryType.id);
  }

  const mergedTocByType: Record<EntryType, TocConfigOverride> = { ...tocByType };
  for (const [type, override] of Object.entries(base.entryLayout.toc.byType)) {
    mergedTocByType[type] = {
      ...(mergedTocByType[type] ?? {}),
      ...override
    };
  }

  return {
    ...base,
    entryTypes: entryTypeIds,
    rss: {
      ...base.rss,
      includeTypes: rssIncludeTypes,
      excludeTypes: rssExcludeTypes
    },
    entryLayout: {
      ...base.entryLayout,
      mode: {
        ...base.entryLayout.mode,
        byType: {
          ...modeByType,
          ...base.entryLayout.mode.byType
        }
      },
      localGraph: { ...base.entryLayout.localGraph },
      toc: {
        ...base.entryLayout.toc,
        default: normalizeTocConfig(
          base.entryLayout.toc.default,
          defaultWritingConfig.entryLayout.toc.default,
          "writing.entryLayout.toc.default"
        ),
        byType: mergedTocByType
      },
      placement: {
        ...base.entryLayout.placement,
        byType: mergePlacementByType(placementByType, base.entryLayout.placement.byType)
      },
      asides: {
        ...base.entryLayout.asides,
        byType: {
          ...asidesByType,
          ...base.entryLayout.asides.byType
        }
      }
    }
  };
}

/**
 * Layer the site's `placement.byType` over the entry types' own placement,
 * field by field. A site that sets only `byType.hub.related` keeps the hub
 * type's `toc` and `localGraph` placement rather than replacing it.
 */
export function mergePlacementByType(
  fromTypes: Record<EntryType, PlacementOverride>,
  fromSite: Record<EntryType, PlacementOverride>
): Record<EntryType, PlacementOverride> {
  const merged: Record<EntryType, PlacementOverride> = { ...fromTypes };
  for (const [type, override] of Object.entries(fromSite)) {
    const base = merged[type] ?? {};
    const out: PlacementOverride = { ...base };
    for (const key of Object.keys(override) as Array<keyof PlacementOverride>) {
      out[key] = { ...base[key], ...override[key] } as never;
    }
    merged[type] = out;
  }
  return merged;
}

export function validateEntryTypes(values: readonly EntryTypeDefinition[]): EntryTypeDefinition[] {
  if (values.length === 0) throw new Error("At least one writing entry type must be configured.");
  const seen = new Set<string>();
  for (const entryType of values) {
    if (!entryType || typeof entryType !== "object") {
      throw new Error("Entry type definitions must be objects.");
    }
    const id = typeof entryType.id === "string" ? entryType.id : "";
    const label = typeof entryType.label === "string" ? entryType.label : "";
    if (!id.trim()) throw new Error("Entry type ids must not be empty.");
    if (seen.has(id)) throw new Error(`Duplicate entry type id "${id}".`);
    seen.add(id);
    if (!label.trim()) {
      throw new Error(`Entry type "${entryType.id}" must define a display label.`);
    }
    if (!["hub", "section", "entry"].includes(entryType.role)) {
      throw new Error(`Entry type "${entryType.id}" has invalid role "${entryType.role}".`);
    }
    if (!entryType.graph) {
      throw new Error(`Entry type "${entryType.id}" must define graph metadata.`);
    }
    if (!["circle", "square", "diamond", "hexagon"].includes(entryType.graph.shape)) {
      throw new Error(`Entry type "${entryType.id}" has invalid graph shape "${entryType.graph.shape}".`);
    }
    if (entryType.graph.size <= 0) {
      throw new Error(`Entry type "${entryType.id}" must define a positive graph size.`);
    }
  }
  return values.map((entryType) => ({
    ...entryType,
    ownsFolder: entryType.ownsFolder ?? entryType.role !== "entry",
    includeInRss: entryType.includeInRss ?? entryType.role === "entry",
    includeInRecent: entryType.includeInRecent ?? entryType.role === "entry",
    article: {
      ...entryType.article
    },
    graph: {
      ...entryType.graph
    }
  }));
}

function mergeConfig<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (override === undefined) return cloneConfig(base);
  if (Array.isArray(base) || Array.isArray(override) || !isRecord(base) || !isRecord(override)) {
    return cloneConfig(override as T);
  }

  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseValue = (base as Record<string, unknown>)[key];
    output[key] = mergeConfig(baseValue, value as never);
  }
  return output as T;
}

function cloneConfig<T>(value: T): T {
  if (Array.isArray(value)) return [...value] as T;
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneConfig(child)])
  ) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
