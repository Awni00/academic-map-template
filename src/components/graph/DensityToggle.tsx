import type { TopicsDensity } from "../../config/writing";

const DENSITIES: TopicsDensity[] = ["comfortable", "minimal", "dense"];

const DENSITY_LABEL: Record<TopicsDensity, string> = {
  comfortable: "Comfortable",
  minimal: "Minimal",
  dense: "Dense"
};

type Props = {
  density: TopicsDensity;
  onDensity: (d: TopicsDensity) => void;
};

/** Row density for Topics and List; shown in the Sort panel when enabled. */
export default function DensityToggle({ density, onDensity }: Props) {
  return (
    <span className="density-toggle" role="group" aria-label="Row density">
      {DENSITIES.map((d) => (
        <button key={d} type="button" aria-pressed={d === density} onClick={() => onDensity(d)}>
          {DENSITY_LABEL[d]}
        </button>
      ))}
    </span>
  );
}
