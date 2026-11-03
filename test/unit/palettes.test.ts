import { describe, expect, it } from "vitest";
import { DEFAULT_FAMILY, PALETTE_FAMILIES, parseColor, resolvePalette, rotateToAccent, type ThemeContext } from "../../src/core/palettes";

const ctx = (name: string, dark = false, classes: string[] = [], accent?: string): ThemeContext => ({ name, dark, classes, accent });

describe("auto theme palette detection", () => {
  it("gives the default theme the default palette for its mode", () => {
    expect(resolvePalette(ctx("")).variant).toBe("default-light");
    expect(resolvePalette(ctx("", true)).variant).toBe("default-dark");
  });

  it("matches community themes by name", () => {
    expect(resolvePalette(ctx("Nord", true)).variant).toBe("nord-dark");
    expect(resolvePalette(ctx("Obsidian Nord")).variant).toBe("nord-light");
    expect(resolvePalette(ctx("Rosé Pine", true)).variant).toBe("rosepine-main");
    expect(resolvePalette(ctx("Tokyo Night", true)).variant).toBe("tokyonight-night");
    expect(resolvePalette(ctx("Everforest Enchanted")).variant).toBe("everforest-light");
    expect(resolvePalette(ctx("Dracula for Obsidian", true)).variant).toBe("dracula-dark");
  });

  it("reads Minimal's color scheme for the current mode", () => {
    const classes = ["minimal-theme", "minimal-gruvbox-light", "minimal-nord-dark", "minimal-light-tonal"];
    expect(resolvePalette(ctx("Minimal", false, classes)).variant).toBe("gruvbox-light");
    expect(resolvePalette(ctx("Minimal", true, classes)).variant).toBe("nord-dark");
    expect(resolvePalette(ctx("Minimal", true, ["minimal-rose-pine-dark"])).variant).toBe("rosepine-main");
    expect(resolvePalette(ctx("Minimal", false, ["minimal-default-light"])).family).toBe("default");
  });

  it("reads AnuPpuccin and Catppuccin flavors from body classes", () => {
    expect(resolvePalette(ctx("AnuPpuccin", true, ["ctp-macchiato"])).variant).toBe("catppuccin-macchiato");
    expect(resolvePalette(ctx("AnuPpuccin", true, [])).variant).toBe("catppuccin-mocha");
    expect(resolvePalette(ctx("AnuPpuccin", false, ["ctp-latte"])).variant).toBe("catppuccin-latte");
    expect(resolvePalette(ctx("Catppuccin", true, ["ctp-frappe"])).variant).toBe("catppuccin-frappe");
    expect(resolvePalette(ctx("AnuPpuccin", true, ["ctp-nord"])).family).toBe("nord");
  });

  it("sends e-ink and grayscale themes to the eink theme by exact name only", () => {
    expect(resolvePalette(ctx("Ink")).family).toBe("eink");
    expect(resolvePalette(ctx("MonoGray")).family).toBe("eink");
    expect(resolvePalette(ctx("Borozdov", true)).family).toBe("eink");
    expect(resolvePalette(ctx("Settled Ink")).family).toBe("default");
    expect(resolvePalette(ctx("Ink Paper")).family).toBe("default");
  });

  it("does not let stray body classes pick a family for other themes", () => {
    expect(resolvePalette(ctx("Things", true, ["minimal-nord-dark", "ctp-mocha"])).family).toBe("default");
  });

  it("leads the default palette with the hue nearest the accent, keeping the cycle", () => {
    const base = DEFAULT_FAMILY.variants[0].colors;
    const blue = resolvePalette(ctx("Things", false, [], "#1b61c2")).colors;
    expect(blue[0]).toBe("#2f70c7");
    expect(blue).toHaveLength(base.length);
    expect([...blue.slice(blue.length - 2), ...blue.slice(0, 2)].join()).toContain(base.slice(-2).join());
    // Obsidian's own accent is violet, so the default theme keeps the validated order.
    expect(resolvePalette(ctx("", false, [], "hsl(258, 88%, 66%)")).colors).toEqual([...base]);
    expect(rotateToAccent(base, "#808080")).toEqual([...base]);
    expect(rotateToAccent(base, "var(--x)")).toEqual([...base]);
  });

  it("parses the color forms CSS variables come back in", () => {
    expect(parseColor("#fff")).toEqual([1, 1, 1]);
    expect(parseColor("rgb(255, 0, 0)")).toEqual([1, 0, 0]);
    expect(parseColor("rgba(0 0 255 / 0.5)")).toEqual([0, 0, 1]);
    const hsl = parseColor("hsl(120, 100%, 50%)")!;
    expect(hsl.map((x) => Math.round(x * 255))).toEqual([0, 255, 0]);
    expect(parseColor("color-mix(in srgb, red, blue)")).toBeNull();
  });
});

// --- The palettes stay validated: the gates they were generated against (Machado 2009 CVD, OKLab ΔE ×100). ---

const SURFACE: Record<string, string> = {
  "default-light": "#ffffff", "default-dark": "#1e1e1e",
  "catppuccin-latte": "#eff1f5", "catppuccin-mocha": "#1e1e2e", "catppuccin-macchiato": "#24273a", "catppuccin-frappe": "#303446",
  "rosepine-dawn": "#faf4ed", "rosepine-main": "#191724", "rosepine-moon": "#232136",
  "tokyonight-day": "#e1e2e7", "tokyonight-night": "#1a1b26", "tokyonight-storm": "#24283b",
  "nord-light": "#eceff4", "nord-dark": "#2e3440", "gruvbox-light": "#fbf1c7", "gruvbox-dark": "#282828",
  "everforest-light": "#fdf6e3", "everforest-dark": "#2d353b", "solarized-light": "#fdf6e3", "solarized-dark": "#002b36",
  "dracula-light": "#fffbeb", "dracula-dark": "#282a36", "atom-light": "#fafafa", "atom-dark": "#282c34",
  "flexoki-light": "#fffcf0", "flexoki-dark": "#100f0f",
};
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const lin = (h: string): number[] => parseColor(h)!.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const lab = ([r, g, b]: number[]): number[] => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const sim = (h: string, M?: number[][]): number[] => {
  const v = lin(h);
  return M ? M.map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2]))) : v;
};
const dE = (a: string, b: string, M?: number[][]): number => { const [p, q] = [lab(sim(a, M)), lab(sim(b, M))]; return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const lum = (h: string): number => { const [r, g, b] = lin(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string): number => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe("shipped palettes", () => {
  const all = [DEFAULT_FAMILY, ...PALETTE_FAMILIES].flatMap((f) => f.variants.map((v) => ({ ...v, cyclic: f === DEFAULT_FAMILY })));
  it.each(all)("$id clears the color-blind, normal-vision and contrast gates", (p) => {
    const c = p.colors;
    const pairs = c.slice(1).map((x, i) => [c[i], x]);
    if (p.cyclic) pairs.push([c[c.length - 1], c[0]]);
    for (const [a, b] of [...pairs, [c[0], c[2]]]) {
      expect(Math.min(dE(a, b, MACHADO.protan), dE(a, b, MACHADO.deutan)), `${a}/${b} CVD`).toBeGreaterThanOrEqual(8);
    }
    for (const [a, b] of pairs) expect(dE(a, b), `${a}/${b} normal`).toBeGreaterThanOrEqual(15);
    const surface = SURFACE[p.id];
    expect(surface, `surface for ${p.id}`).toBeDefined();
    for (const x of c) expect(contrast(x, surface), `${x} on ${surface}`).toBeGreaterThanOrEqual(3);
  });

  it("has a light and a dark variant in every family, each a known surface", () => {
    for (const f of [DEFAULT_FAMILY, ...PALETTE_FAMILIES]) {
      expect(f.variants.some((v) => v.dark), f.id).toBe(true);
      expect(f.variants.some((v) => !v.dark), f.id).toBe(true);
    }
  });
});
