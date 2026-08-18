import { defaultEntryTypes } from "./defaults/entryTypes";
import { defaultGraphConfig } from "./defaults/graph";
import { defaultPublicationsConfig } from "./defaults/publications";
import { defaultSiteConfig } from "./defaults/site";
import { defaultThemeConfig } from "./defaults/theme";
import { defaultWritingConfig } from "./defaults/writing";
import { siteConfigOverrides } from "../site/config";
import { normalizeTocConfig } from "../lib/article/toc";
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
  ThemeConfig,
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
  graph: fallbackGraph,
  article: {
    localGraph: true
  }
};

export const entryTypeDefinitions = validateEntryTypes(
  siteConfigOverrides.entryTypes ?? defaultEntryTypes
);

const entryTypeById = new Map(entryTypeDefinitions.map((entryType) => [entryType.id, entryType]));

export const entryTypeIds = entryTypeDefinitions.map((entryType) => entryType.id);

export const siteConfig = mergeConfig<SiteConfig>(defaultSiteConfig, siteConfigOverrides.site);
export const themeConfig = mergeConfig<ThemeConfig>(defaultThemeConfig, siteConfigOverrides.theme);
export const publicationsConfig = mergeConfig<PublicationsConfig>(
  defaultPublicationsConfig,
  siteConfigOverrides.publications
);

export const graphConfig: GraphConfig = {
  ...mergeConfig<GraphConfigBase>(defaultGraphConfig, siteConfigOverrides.graph),
  nodeTypes: Object.fromEntries(
    entryTypeDefinitions.map((entryType) => [entryType.id, entryType.graph])
  )
};

export const writingConfig: WritingConfig = resolveWritingConfig();

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
  const localGraphByType: Record<EntryType, boolean> = {};
  const placementByType: WritingConfig["entryLayout"]["placement"]["byType"] = {};
  const asidesByType: Record<EntryType, AsidePlacement> = {};
  const tocByType: Record<EntryType, TocConfigOverride> = {};
  const rssIncludeTypes: EntryType[] = [];
  const rssExcludeTypes: EntryType[] = [];

  for (const entryType of entryTypeDefinitions) {
    modeByType[entryType.id] = entryType.article?.mode ?? base.entryLayout.mode.default;
    localGraphByType[entryType.id] = entryType.article?.localGraph ?? true;
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
      localGraph: {
        ...base.entryLayout.localGraph,
        byType: {
          ...localGraphByType,
          ...base.entryLayout.localGraph.byType
        }
      },
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
        byType: {
          ...placementByType,
          ...base.entryLayout.placement.byType
        }
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
