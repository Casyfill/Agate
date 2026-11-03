/**
 * Category palettes made for popular Obsidian themes, and the detection the `auto` theme uses to
 * pick one. Each palette is the theme's own colors, stepped for contrast (at least 3:1 against
 * the theme's note background) where the upstream value is too faint, and put in an order where
 * neighbors stay apart for color-blind readers (OKLab ΔE ≥ 8 under protan and deutan simulation,
 * ≥ 15 under normal vision, the first three slots apart from each other too). The values were
 * generated offline and validated as a set; edit one and re-validate the whole palette.
 */

export interface PaletteVariant {
  /** Stable id, e.g. `catppuccin-mocha`. */
  id: string;
  dark: boolean;
  /** Matched against body classes and the theme name to pick a flavor, e.g. `mocha`. */
  keyword?: string;
  colors: readonly string[];
}

export interface PaletteFamily {
  id: string;
  /** Normalized (lowercase, letters and digits) substrings of a theme or color scheme name. */
  match: readonly string[];
  /** First variant of each mode is that mode's default. */
  variants: readonly PaletteVariant[];
}

const v = (id: string, dark: boolean, colors: string[], keyword?: string): PaletteVariant => ({ id, dark, colors, keyword });

/** Obsidian's own named hues, toned down to one lightness band per mode, for the default theme and neutral themes. */
export const DEFAULT_FAMILY: PaletteFamily = {
  id: "default",
  match: [],
  variants: [
    v("default-light", false, ["#705fc3", "#d87429", "#019391", "#ca5558", "#b98e06", "#c35483", "#2f70c7", "#2c9849"]),
    v("default-dark", true, ["#9084dd", "#ea9258", "#0bb5b2", "#e47b7b", "#e2b850", "#dd7aa1", "#5b93e0", "#5fb470"]),
  ],
};

export const PALETTE_FAMILIES: readonly PaletteFamily[] = [
  {
    id: "catppuccin",
    match: ["catppuccin", "anuppuccin", "ctp"],
    variants: [
      v("catppuccin-latte", false, ["#8839ef", "#ee5c02", "#179299", "#3e9e29", "#1e66f5", "#c57a00", "#d260b4", "#d20f39"], "latte"),
      v("catppuccin-mocha", true, ["#cba6f7", "#f9e2af", "#f38ba8", "#a6e3a1", "#f5c2e7", "#89b4fa", "#fab387", "#94e2d5"], "mocha"),
      v("catppuccin-macchiato", true, ["#c6a0f6", "#8bd5ca", "#f5a97f", "#8aadf4", "#eed49f", "#ed8796", "#a6da95", "#f5bde6"], "macchiato"),
      v("catppuccin-frappe", true, ["#ca9ee6", "#e5c890", "#e78284", "#f4b8e4", "#a6d189", "#8caaee", "#ef9f76", "#81c8be"], "frappe"),
    ],
  },
  {
    id: "rosepine",
    match: ["rosepine"],
    variants: [
      v("rosepine-dawn", false, ["#927cac", "#1f627b", "#c4716d", "#5997a2", "#c57d05", "#b36078"], "dawn"),
      v("rosepine-main", true, ["#c4a7e7", "#f6c177", "#31748f", "#9ccfd8", "#eb6f92", "#ebbcba"]),
      v("rosepine-moon", true, ["#c4a7e7", "#eb6f92", "#f6c177", "#9ccfd8", "#3e8fb0", "#ea9a97"], "moon"),
    ],
  },
  {
    id: "tokyonight",
    match: ["tokyonight", "tokyo"],
    variants: [
      v("tokyonight-day", false, ["#2e7de9", "#587539", "#007197", "#b15c00", "#118c74", "#f52a65", "#9854f1", "#8c6c3e"], "day"),
      v("tokyonight-night", true, ["#7aa2f7", "#ff9e64", "#73daca", "#e0af68", "#bb9af7", "#9ece6a", "#7dcfff", "#f7768e"], "night"),
      v("tokyonight-storm", true, ["#7aa2f7", "#ff9e64", "#73daca", "#e0af68", "#bb9af7", "#9ece6a", "#7dcfff", "#f7768e"], "storm"),
    ],
  },
  {
    id: "nord",
    match: ["nord"],
    variants: [
      v("nord-light", false, ["#476d9c", "#ad6751", "#5690a0", "#a6853e", "#a2434f", "#a57d9e", "#6c8656"]),
      v("nord-dark", true, ["#88c0d0", "#d08770", "#5e81ac", "#a3be8c", "#bf616a", "#ebcb8b", "#b48ead"]),
    ],
  },
  {
    id: "gruvbox",
    match: ["gruvbox"],
    variants: [
      v("gruvbox-light", false, ["#076678", "#9d0006", "#79740e", "#8f3f71", "#b57614", "#427b58", "#af3a03"]),
      v("gruvbox-dark", true, ["#83a598", "#fb4934", "#b8bb26", "#d3869b", "#fabd2f", "#8ec07c", "#fe8019"]),
    ],
  },
  {
    id: "everforest",
    match: ["everforest"],
    variants: [
      v("everforest-light", false, ["#849705", "#da64b5", "#2da176", "#ba8502", "#3a94c5", "#f85552"]),
      v("everforest-dark", true, ["#c7e19f", "#f09d78", "#89d0c6", "#cc8cab", "#dbbc7f", "#df7376", "#86c595"]),
    ],
  },
  {
    id: "solarized",
    match: ["solarized"],
    variants: [
      v("solarized-light", false, ["#268bd2", "#b38805", "#d33682", "#849703", "#6c71c4", "#cb4b16", "#259e95", "#dc322f"]),
      v("solarized-dark", true, ["#268bd2", "#b58900", "#d33682", "#859900", "#6c71c4", "#cb4b16", "#2aa198", "#dc322f"]),
    ],
  },
  {
    id: "dracula",
    match: ["dracula", "alucard"],
    variants: [
      v("dracula-light", false, ["#644ac9", "#a3144d", "#846e15", "#036a96", "#cb3a2a"]),
      v("dracula-dark", true, ["#bd93f9", "#ff5555", "#f1fa8c", "#8be9fd", "#50fa7b", "#ff79c6", "#ffb86c"]),
    ],
  },
  {
    id: "atom",
    match: ["atom", "onedark"],
    variants: [
      v("atom-light", false, ["#4078f2", "#c18401", "#a626a4", "#50a14f", "#986801", "#0184bc", "#e45649"]),
      v("atom-dark", true, ["#61afef", "#e06c75", "#e5c07b", "#56b6c2", "#d19a66", "#c678dd", "#98c379"]),
    ],
  },
  {
    id: "flexoki",
    match: ["flexoki"],
    variants: [
      v("flexoki-light", false, ["#205ea6", "#bc5215", "#24837b", "#5e409d", "#66800b", "#a02f6f", "#ad8301", "#af3029"]),
      v("flexoki-dark", true, ["#4385be", "#d0a215", "#d14d41", "#8b7ec8", "#879a39", "#ce5d97", "#da702c", "#3aa99f"]),
    ],
  },
];

/**
 * Themes made for e-ink or strictly grayscale screens, by exact normalized name: "Ink" is
 * harmtemolder's e-ink theme, while "Settled Ink" and "Ink Paper" are colored and must not match.
 * `auto` gives these the whole `eink` theme, not only a palette.
 */
export const EINK_THEMES: readonly string[] = ["ink", "monogray", "borozdov"];

/** What `auto` looks at: the community theme's name ("" for the default theme), body classes and the mode. */
export interface ThemeContext {
  name: string;
  classes: readonly string[];
  dark: boolean;
  /** The theme's accent color as CSS (`--color-accent`); leads the default palette. */
  accent?: string;
}

export interface ResolvedPalette {
  family: string;
  variant: string;
  colors: string[];
}

const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Themes that carry several color schemes and say which one is active with a body class. */
const HOSTS = ["minimal", "anuppuccin", "catppuccin"];

function familyFor(token: string): PaletteFamily | undefined {
  const t = norm(token);
  if (!t) return undefined;
  return PALETTE_FAMILIES.find((f) => f.match.some((m) => t.includes(m)));
}

function pickVariant(family: PaletteFamily, ctx: ThemeContext, hints: readonly string[]): PaletteVariant {
  const inMode = family.variants.filter((x) => x.dark === ctx.dark);
  const pool = inMode.length ? inMode : family.variants;
  const tokens = hints.map(norm);
  return pool.find((x) => x.keyword && tokens.some((t) => t.includes(x.keyword!))) ?? pool[0];
}

/**
 * Pick the palette for the active theme. Minimal's color scheme comes from its
 * `minimal-<scheme>-<light|dark>` class; AnuPpuccin and Catppuccin flavors from their classes.
 * Anything unrecognized gets the default palette, rotated so the hue nearest the accent leads.
 */
export function resolvePalette(ctx: ThemeContext): ResolvedPalette {
  const name = norm(ctx.name);
  const mode = ctx.dark ? "dark" : "light";
  if (EINK_THEMES.includes(name)) return { family: "eink", variant: "eink", colors: [] };
  let family: PaletteFamily | undefined;
  let hints: string[] = [ctx.name];

  if (name.includes("minimal")) {
    const re = new RegExp(`^minimal-(.+)-${mode}$`);
    const scheme = ctx.classes.map((c) => re.exec(c)?.[1]).find((s): s is string => !!s);
    if (scheme) {
      family = familyFor(scheme);
      hints = [scheme];
    }
  } else {
    family = familyFor(ctx.name);
    if (HOSTS.some((h) => name.includes(h))) {
      // AnuPpuccin's extra flavors (Nord, Rosé Pine, …) are `ctp-` body classes too.
      const fromClass = ctx.classes
        .filter((c) => c.startsWith("ctp-"))
        .map((c) => familyFor(c.slice(4)))
        .find((f) => f && f.id !== "catppuccin");
      if (fromClass) family = fromClass;
      hints = [...ctx.classes, ctx.name];
    }
  }

  if (family) {
    const variant = pickVariant(family, ctx, hints);
    return { family: family.id, variant: variant.id, colors: [...variant.colors] };
  }
  const variant = pickVariant(DEFAULT_FAMILY, ctx, []);
  return { family: DEFAULT_FAMILY.id, variant: variant.id, colors: rotateToAccent(variant.colors, ctx.accent) };
}

/**
 * Rotate (not reorder) the palette so the slot nearest the accent's hue comes first. Rotation keeps
 * every neighbor pair but one, and the default palette was validated as a cycle. A gray accent
 * leaves the order alone.
 */
export function rotateToAccent(colors: readonly string[], accent: string | undefined): string[] {
  const a = accent ? parseColor(accent) : null;
  if (!a) return [...colors];
  const [, ca, ha] = lch(a);
  if (ca < 0.04) return [...colors];
  let best = 0;
  let bestDist = Infinity;
  colors.forEach((c, i) => {
    const rgb = parseColor(c);
    if (!rgb) return;
    const d = Math.abs(((lch(rgb)[2] - ha + 540) % 360) - 180);
    if (d < bestDist) [best, bestDist] = [i, d];
  });
  return [...colors.slice(best), ...colors.slice(0, best)];
}

// --- color math (sRGB → OKLab), enough to read CSS colors and compare them ---

/** Parse #rgb, #rrggbb, rgb()/rgba() and hsl()/hsla() into sRGB 0–1. Anything else (named colors, color-mix) gives null. */
export function parseColor(css: string): [number, number, number] | null {
  const s = css.trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  }
  m = /^(rgb|hsl)a?\(([^)]*)\)$/.exec(s);
  if (!m) return null;
  const parts = m[2].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
  if (parts.length < 3) return null;
  const num = (p: string, scale: number): number => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p));
  if (m[1] === "rgb") {
    const rgb = parts.map((p) => num(p, 255) / 255);
    return rgb.some(Number.isNaN) ? null : (rgb.map((x) => Math.min(1, Math.max(0, x))) as [number, number, number]);
  }
  const h = parseFloat(parts[0]);
  const sat = num(parts[1], 1);
  const l = num(parts[2], 1);
  if ([h, sat, l].some(Number.isNaN)) return null;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLCH: lightness, chroma, hue in degrees. */
function lch(rgb: [number, number, number]): [number, number, number] {
  const [L, a, b] = oklab(rgb);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** Mix two CSS colors in sRGB, `t` = 0 gives `a`, 1 gives `b`, as #rrggbb. Unparsable input falls back to black and white. */
export function mixColors(a: string, b: string, t: number): string {
  const x = parseColor(a) ?? [0, 0, 0];
  const y = parseColor(b) ?? [1, 1, 1];
  return (
    "#" +
    x
      .map((c, i) => Math.round((c + (y[i] - c) * t) * 255))
      .map((n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** OKLab distance ×100 between two CSS colors, or null when either does not parse. */
export function colorDistance(x: string, y: string): number | null {
  const a = parseColor(x);
  const b = parseColor(y);
  if (!a || !b) return null;
  const [p, q] = [oklab(a), oklab(b)];
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
