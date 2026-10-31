import { useMemo, useState } from "react";

import GraphCanvas from "../components/graph/GraphCanvas";
import { getEntryType, graphConfig } from "../config";
import type {
  GraphConfigBase,
  GraphForcesConfig,
  GraphHoverConfig,
  GraphHoverLabels
} from "../config/types";
import type { GraphIndex } from "../lib/graph/types";

type Links = Pick<GraphConfigBase["links"], "width" | "opacity" | "curvature" | "directed">;
type Hubs = GraphConfigBase["layout"]["hubs"];

type Settings = {
  hubs: Hubs;
  forces: GraphForcesConfig;
  links: Links;
  hover: GraphHoverConfig;
  sizes: Record<string, number>;
};

type Slider = { key: string; label: string; min: number; max: number; step: number; hint: string };

const FORCE_SLIDERS: (Slider & { key: keyof GraphForcesConfig })[] = [
  { key: "hubRepulsion", label: "Hub repulsion", min: 0, max: 500, step: 5, hint: "How hard hubs push everything away" },
  { key: "entryRepulsion", label: "Page repulsion", min: 0, max: 200, step: 1, hint: "How hard other pages push apart" },
  { key: "repulsionRange", label: "Repulsion range", min: 50, max: 600, step: 10, hint: "Beyond this, nodes stop pushing" },
  { key: "groupDistance", label: "Distance to hub", min: 10, max: 120, step: 1, hint: "How far a page sits from its hub" },
  { key: "groupPull", label: "Pull toward hub", min: 0, max: 1, step: 0.01, hint: "How firmly it is held there" },
  { key: "linkLength", label: "Link length", min: 10, max: 150, step: 1, hint: "A link inside a group" },
  { key: "crossLinkLength", label: "Cross-link length", min: 20, max: 250, step: 1, hint: "A link between groups" },
  { key: "crossLinkStrength", label: "Cross-link strength", min: 0, max: 1, step: 0.01, hint: "How much groups lean together" },
  { key: "minGap", label: "Minimum gap", min: 0, max: 60, step: 1, hint: "Clear space between glyphs" },
  { key: "centerPull", label: "Centre pull", min: 0, max: 0.3, step: 0.005, hint: "Keeps loose groups near the rest" }
];

const LINK_SLIDERS: (Slider & { key: "width" | "opacity" | "curvature" })[] = [
  { key: "width", label: "Edge width", min: 0.25, max: 4, step: 0.05, hint: "Screen pixels" },
  { key: "opacity", label: "Edge opacity", min: 0, max: 1, step: 0.01, hint: "At rest" },
  { key: "curvature", label: "Edge curvature", min: 0, max: 0.5, step: 0.01, hint: "0 draws straight lines" }
];

const HUB_LAYOUTS: Hubs[] = ["cluster", "circle", "row", "force"];
const HOVER_LABELS: GraphHoverLabels[] = ["node", "neighbours", "none"];

function defaults(types: string[]): Settings {
  return {
    hubs: graphConfig.layout.hubs,
    forces: { ...graphConfig.layout.forces },
    links: {
      width: graphConfig.links.width,
      opacity: graphConfig.links.opacity,
      curvature: graphConfig.links.curvature,
      directed: graphConfig.links.directed
    },
    hover: { ...graphConfig.hover },
    sizes: Object.fromEntries(types.map((type) => [type, getEntryType(type).graph.size]))
  };
}

/**
 * Two copies of the writing map, side by side: one drawn from the site's
 * config as it stands, one from the controls. Changing a control re-runs only
 * the second; the generated snippet carries the changed values into
 * `src/site/config.ts`.
 */
export default function GraphPlayground({ graph }: { graph: GraphIndex }) {
  const types = useMemo(() => [...new Set(graph.nodes.map((node) => node.type))], [graph]);
  const base = useMemo(() => defaults(types), [types]);
  const [settings, setSettings] = useState<Settings>(base);
  const [selected, setSelected] = useState<string | undefined>();
  // Bumped to remount both canvases, replaying the layout from its seed.
  const [run, setRun] = useState(0);
  const [height, setHeight] = useState(520);
  const [copied, setCopied] = useState(false);

  const links = useMemo(() => ({ ...settings.links }), [settings.links]);
  const forces = useMemo(() => ({ ...settings.forces }), [settings.forces]);
  const sizes = useMemo(() => ({ ...settings.sizes }), [settings.sizes]);
  const snippet = useMemo(() => configSnippet(base, settings), [base, settings]);
  const changed = snippet !== null;

  // Functional updates throughout: two quick changes in a row must both land,
  // which reading `settings` from this render would not guarantee.
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));
  const patch = <K extends "forces" | "links" | "hover" | "sizes">(key: K, field: string, value: unknown) =>
    setSettings((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  async function copy() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable: the snippet is on screen to select by hand */
    }
  }

  return (
    <div className="gp">
      <aside className="gp-controls">
        <div className="gp-actions">
          <button type="button" className="gp-btn" onClick={() => setSettings(base)} disabled={!changed}>
            Reset all
          </button>
          <button type="button" className="gp-btn" onClick={() => setRun((n) => n + 1)}>
            Replay layout
          </button>
        </div>

        <Group title="Layout">
          <Select
            label="Hub layout"
            value={settings.hubs}
            options={HUB_LAYOUTS}
            changed={settings.hubs !== base.hubs}
            onChange={(value) => set("hubs", value as Hubs)}
          />
          <p className="gp-note">The forces below apply to the cluster layout.</p>
          {FORCE_SLIDERS.map((slider) => (
            <Range
              key={slider.key}
              slider={slider}
              value={settings.forces[slider.key]}
              base={base.forces[slider.key]}
              onChange={(value) => patch("forces", slider.key, value)}
            />
          ))}
        </Group>

        <Group title="Edges">
          {LINK_SLIDERS.map((slider) => (
            <Range
              key={slider.key}
              slider={slider}
              value={settings.links[slider.key]}
              base={base.links[slider.key]}
              onChange={(value) => patch("links", slider.key, value)}
            />
          ))}
          <Toggle
            label="Arrowheads"
            value={settings.links.directed}
            changed={settings.links.directed !== base.links.directed}
            onChange={(value) => patch("links", "directed", value)}
          />
        </Group>

        <Group title="Hover">
          <Select
            label="Labels on hover"
            value={settings.hover.labels}
            options={HOVER_LABELS}
            changed={settings.hover.labels !== base.hover.labels}
            onChange={(value) => patch("hover", "labels", value as GraphHoverLabels)}
          />
          <Toggle
            label="Fade the rest"
            value={settings.hover.dim}
            changed={settings.hover.dim !== base.hover.dim}
            onChange={(value) => patch("hover", "dim", value)}
          />
        </Group>

        <Group title="Node sizes">
          {types.map((type) => (
            <Range
              key={type}
              slider={{ key: type, label: getEntryType(type).label, min: 4, max: 40, step: 1, hint: "Diameter, px" }}
              value={settings.sizes[type]}
              base={base.sizes[type]}
              onChange={(value) => patch("sizes", type, value)}
            />
          ))}
        </Group>

        <Group title="Canvas">
          <Range
            slider={{ key: "height", label: "Canvas height", min: 280, max: 800, step: 10, hint: "Preview only" }}
            value={height}
            base={520}
            onChange={setHeight}
          />
        </Group>
      </aside>

      <div className="gp-main">
        <div className="gp-maps">
          <MapPane
            title="Current config"
            subtitle="What the site draws now"
            key={`base-${run}-${height}`}
            graph={graph}
            height={height}
            selected={selected}
            onSelect={setSelected}
            hubLayout={base.hubs}
          />
          <MapPane
            title="Your settings"
            subtitle={changed ? "Changed values are marked in the controls" : "Same as current — move a control"}
            accent
            key={`yours-${run}-${height}-${settings.hubs}`}
            graph={graph}
            height={height}
            selected={selected}
            onSelect={setSelected}
            hubLayout={settings.hubs}
            hover={settings.hover}
            links={links}
            forces={forces}
            nodeSizes={sizes}
          />
        </div>
        <p className="gp-tip">
          Click a node to select it on both maps. Hover to compare the highlight. Drag, pan and
          zoom work as on the writing page.
        </p>

        <section className="gp-config">
          <div className="gp-config__head">
            <strong>Config for src/site/config.ts</strong>
            <button type="button" className="gp-btn" onClick={copy} disabled={!changed}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>{snippet ?? "// Nothing changed yet. Move a control to generate overrides."}</pre>
          <p className="gp-note">
            Paste the <code>graph</code> block into <code>siteConfigOverrides</code>, merging with
            anything already there, then restart the dev server. Node sizes live on the entry
            types, so they come as an <code>entryTypes</code> line that keeps every default type
            and changes only <code>graph.size</code>.
          </p>
        </section>
      </div>
    </div>
  );
}

function MapPane({
  title,
  subtitle,
  accent = false,
  ...canvas
}: { title: string; subtitle: string; accent?: boolean } & React.ComponentProps<typeof GraphCanvas>) {
  return (
    <figure className={accent ? "gp-map gp-map--accent" : "gp-map"}>
      <figcaption>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </figcaption>
      <div className="gp-canvas">
        <GraphCanvas
          drag={graphConfig.interaction.drag}
          labelMode={graphConfig.layout.labels}
          labelSide={graphConfig.layout.labelSide}
          zoomControls
          fitPad={36}
          {...canvas}
        />
      </div>
    </figure>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="gp-group" open>
      <summary>{title}</summary>
      <div className="gp-group__body">{children}</div>
    </details>
  );
}

function Range({
  slider,
  value,
  base,
  onChange
}: {
  slider: Slider;
  value: number;
  base: number;
  onChange: (value: number) => void;
}) {
  const changed = Math.abs(value - base) > 1e-9;
  return (
    <label className={changed ? "gp-field is-changed" : "gp-field"} title={slider.hint}>
      <span className="gp-field__row">
        <span className="gp-field__label">{slider.label}</span>
        <span className="gp-field__value">
          {format(value)}
          {changed && (
            <button
              type="button"
              className="gp-undo"
              onClick={(event) => {
                event.preventDefault();
                onChange(base);
              }}
              aria-label={`Reset ${slider.label} to ${format(base)}`}
              title={`Reset to ${format(base)}`}
            >
              ↺
            </button>
          )}
        </span>
      </span>
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="gp-field__hint">{slider.hint}</span>
    </label>
  );
}

function Select({
  label,
  value,
  options,
  changed,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  changed: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={changed ? "gp-field is-changed" : "gp-field"}>
      <span className="gp-field__row">
        <span className="gp-field__label">{label}</span>
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  value,
  changed,
  onChange
}: {
  label: string;
  value: boolean;
  changed: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={changed ? "gp-field gp-field--toggle is-changed" : "gp-field gp-field--toggle"}>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      <span className="gp-field__label">{label}</span>
    </label>
  );
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

/** The overrides that turn `base` into `next`, as config source, or null if none. */
function configSnippet(base: Settings, next: Settings): string | null {
  const graph: string[] = [];
  const diff = <T extends Record<string, unknown>>(a: T, b: T) =>
    Object.keys(b).filter((key) => a[key] !== b[key]);

  const layout: string[] = [];
  if (next.hubs !== base.hubs) layout.push(`hubs: "${next.hubs}"`);
  const forceKeys = diff(base.forces, next.forces) as (keyof GraphForcesConfig)[];
  if (forceKeys.length) {
    layout.push(`forces: { ${forceKeys.map((key) => `${key}: ${format(next.forces[key])}`).join(", ")} }`);
  }
  if (layout.length) graph.push(`layout: { ${layout.join(", ")} }`);

  const linkKeys = diff(base.links, next.links) as (keyof Links)[];
  if (linkKeys.length) {
    graph.push(
      `links: { ${linkKeys
        .map((key) => `${key}: ${typeof next.links[key] === "number" ? format(next.links[key] as number) : next.links[key]}`)
        .join(", ")} }`
    );
  }

  const hoverKeys = diff(base.hover, next.hover) as (keyof GraphHoverConfig)[];
  if (hoverKeys.length) {
    graph.push(
      `hover: { ${hoverKeys
        .map((key) => `${key}: ${typeof next.hover[key] === "string" ? `"${next.hover[key]}"` : next.hover[key]}`)
        .join(", ")} }`
    );
  }

  const sizeKeys = diff(base.sizes, next.sizes);
  if (!graph.length && !sizeKeys.length) return null;

  const lines: string[] = [];
  if (sizeKeys.length) {
    lines.push(`// at the top of src/site/config.ts:`);
    lines.push(`import { defaultEntryTypes } from "../config/defaults/entryTypes";`);
    lines.push("");
  }
  lines.push("export const siteConfigOverrides: SiteConfigOverrides = {");
  if (graph.length) {
    lines.push("  graph: {");
    graph.forEach((line, index) => lines.push(`    ${line}${index < graph.length - 1 ? "," : ""}`));
    lines.push(`  }${sizeKeys.length ? "," : ""}`);
  }
  if (sizeKeys.length) {
    const sizes = sizeKeys.map((key) => `"${key}": ${next.sizes[key]}`).join(", ");
    lines.push("  entryTypes: defaultEntryTypes.map((type) => ({");
    lines.push("    ...type,");
    lines.push(
      `    graph: { ...type.graph, size: ({ ${sizes} } as Record<string, number>)[type.id] ?? type.graph.size }`
    );
    lines.push("  }))");
  }
  lines.push("};");
  return lines.join("\n");
}
