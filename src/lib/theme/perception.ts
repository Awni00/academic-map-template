import { parseColor } from "./contrast";

/**
 * Perceptual colour distance, for telling chart series apart.
 *
 * WCAG contrast (in `contrast.ts`) says whether a mark is visible on the
 * page. It says nothing about whether two marks look different from each
 * other, which is what a categorical palette needs, for every reader. That is
 * measured here as Euclidean distance in OKLab, ×100 (ΔE), under normal vision
 * and under simulated protanopia and deuteranopia.
 *
 * The simulation is Machado, Oliveira & Fernandes (2009) at severity 1.0, the
 * model the thresholds in `checkTheme.ts` are calibrated against. Swapping in
 * another model moves borderline pairs, so the two go together.
 *
 * Dependency-free and DOM-free, like `contrast.ts`.
 */

type Vec3 = [number, number, number];

export type ColorVision = "normal" | "protan" | "deutan" | "tritan";

const MACHADO: Record<Exclude<ColorVision, "normal">, [Vec3, Vec3, Vec3]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039]
  ]
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c: number) => Math.max(0, Math.min(1, c));

function linearRgb(color: string): Vec3 {
  const parsed = parseColor(color);
  if (!parsed) throw new Error(`Cannot read colour "${color}".`);
  return [toLinear(parsed.r / 255), toLinear(parsed.g / 255), toLinear(parsed.b / 255)];
}

function oklabFromLinear([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

function linearFromOklab([L, a, b]: Vec3): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}

function simulate(rgb: Vec3, vision: ColorVision): Vec3 {
  if (vision === "normal") return rgb;
  const [r, g, b] = rgb;
  return MACHADO[vision].map(([x, y, z]) => clamp01(x * r + y * g + z * b)) as Vec3;
}

/** A colour in OKLab as `[L, a, b]`, L from 0 (black) to 1 (white). */
export const oklab = (color: string): Vec3 => oklabFromLinear(linearRgb(color));

/** A colour in OKLCH as `[L, C, h]`, h in degrees. */
export function oklch(color: string): Vec3 {
  const [L, a, b] = oklab(color);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/**
 * An OKLCH colour as sRGB hex. Out-of-gamut colours lose chroma (hue and
 * lightness held) until they fit, which is how a browser would map them too.
 */
export function oklchToHex(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  let chroma = C;
  let rgb = linearFromOklab([L, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
  while (chroma > 0 && rgb.some((c) => c < -1e-6 || c > 1 + 1e-6)) {
    chroma = Math.max(0, chroma - 0.002);
    rgb = linearFromOklab([L, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
  }
  const byte = (c: number) =>
    Math.round(clamp01(toGamma(clamp01(c))) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${rgb.map(byte).join("")}`;
}

/** OKLab distance ×100 between two colours, as seen with `vision`. */
export function deltaE(a: string, b: string, vision: ColorVision = "normal"): number {
  const p = oklabFromLinear(simulate(linearRgb(a), vision));
  const q = oklabFromLinear(simulate(linearRgb(b), vision));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** The smaller of the protanopia and deuteranopia distances: the red–green case. */
export const deltaECvd = (a: string, b: string) =>
  Math.min(deltaE(a, b, "protan"), deltaE(a, b, "deutan"));
