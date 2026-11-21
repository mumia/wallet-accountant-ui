// WCAG 2.2 contrast of CSS colours written as oklch(L C H [/ A]), the form
// the theme tokens use. Used by the theme test; nothing at runtime needs it.

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const oklchPattern = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?)\s*)?\)$/;

/** oklch → linear sRGB (Björn Ottosson's matrices), clamped to the gamut. */
export function parseOklch(color: string): Rgba {
  const match = oklchPattern.exec(color);
  if (match === null) {
    throw new Error(`Not an oklch() colour: ${color}`);
  }
  const [, l = "0", c = "0", h = "0", alpha, percent] = match;
  const lightness = Number(l);
  const chroma = Number(c);
  const hue = (Number(h) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l_ = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    r: clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
    a: alpha === undefined ? 1 : Number(alpha) / (percent === "%" ? 100 : 1),
  };
}

const toGamma = (linear: number) =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
const toLinear = (gamma: number) =>
  gamma <= 0.04045 ? gamma / 12.92 : ((gamma + 0.055) / 1.055) ** 2.4;

/** A translucent colour painted over an opaque one, blended in sRGB as browsers do. */
export function over(top: string, bottom: string): Rgba {
  const t = parseOklch(top);
  const u = parseOklch(bottom);
  const mix = (x: number, y: number) => toLinear(toGamma(x) * t.a + toGamma(y) * (1 - t.a));
  return { r: mix(t.r, u.r), g: mix(t.g, u.g), b: mix(t.b, u.b), a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two colours (1 to 21); a translucent foreground is painted over the background. */
export function contrast(foreground: string | Rgba, background: string | Rgba): number {
  const back = typeof background === "string" ? parseOklch(background) : background;
  const front =
    typeof foreground === "string"
      ? parseOklch(foreground).a < 1 && typeof background === "string"
        ? over(foreground, background)
        : parseOklch(foreground)
      : foreground;
  const [light, dark] = [luminance(front), luminance(back)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
