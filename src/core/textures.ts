import type { AnySpec } from "./types";

/**
 * SVG fill textures (hatching, dots) a spec declares under `usermeta.agate.textures` and uses as
 * `url(#name)` wherever a colour goes, including scale ranges, so legends get them too. The
 * options follow textures.js (riccardoscalco/textures) for its `lines`, `circles` and `paths`
 * kinds, without the dependency, plus `rough` for a hand-drawn wobble. SVG renderer only: with
 * canvas each texture falls back to a colour.
 */
export interface TextureDef {
  type?: "lines" | "circles" | "paths";
  /** Pattern tile size, px. */
  size?: number;
  background?: string;
  /** lines */
  stroke?: string;
  strokeWidth?: number;
  /** lines: "vertical", "horizontal", "diagonal", or textures.js "0/8" … "7/8"; an array crosses them. */
  orientation?: string | string[];
  /** circles */
  radius?: number;
  fill?: string;
  /** circles: a second dot in each tile, offset by half, for a denser staggered grid. */
  complement?: boolean;
  /** paths: a named shape (see PATHS) or a raw SVG path for an s×s tile, with {s} standing for the size. */
  d?: string;
  /** SVG shape-rendering: "auto" (default), "crispEdges", "geometricPrecision". */
  shapeRendering?: string;
  /** Hand-drawn wobble: displaces the pattern by up to this many px with SVG turbulence. */
  rough?: number;
}

/** textures.js's named `paths` shapes, for an s×s tile. */
const PATHS: Record<string, (s: number) => string> = {
  squares: (s) => `M ${s / 4} ${s / 4} l ${s / 2} 0 l 0 ${s / 2} l ${-s / 2} 0 Z`,
  nylon: (s) =>
    `M 0 ${(s * 3) / 4} l ${s / 4} 0 l 0 ${-s / 4} M ${(s * 3) / 4} ${s} l 0 ${-s / 4} l ${s / 4} 0 M ${s / 4} 0 l 0 ${s / 4} l ${s / 4} 0 M ${s / 2} ${s / 4} l ${s / 4} 0 l 0 ${s / 4} M ${s / 2} ${(s * 3) / 4} l 0 ${-s / 4} l ${-s / 4} 0 l 0 ${-s / 4}`,
  waves: (s) =>
    `M 0 ${s / 2} c ${s / 8} ${-s / 4} , ${(s * 3) / 8} ${-s / 4} , ${s / 2} 0 c ${s / 8} ${s / 4} , ${(s * 3) / 8} ${s / 4} , ${s / 2} 0 M ${-s / 2} ${s / 2} c ${s / 8} ${s / 4} , ${(s * 3) / 8} ${s / 4} , ${s / 2} 0 M ${s} ${s / 2} c ${s / 8} ${-s / 4} , ${(s * 3) / 8} ${-s / 4} , ${s / 2} 0`,
  woven: (s) =>
    `M ${s / 4},${s / 4} l ${s / 2},${s / 2} M ${(s * 3) / 4},${s / 4} l ${s / 2},${-s / 2} M ${s / 4},${(s * 3) / 4} l ${-s / 2},${s / 2} M ${(s * 3) / 4},${(s * 5) / 4} l ${s / 2},${-s / 2} M ${-s / 4},${s / 4} l ${s / 2},${-s / 2}`,
  crosses: (s) => `M ${s / 4},${s / 4} l ${s / 2},${s / 2} M ${s / 4},${(s * 3) / 4} l ${s / 2},${-s / 2}`,
  caps: (s) => `M ${s / 4},${(s * 3) / 4} l ${s / 4},${-s / 2} l ${s / 4},${s / 2}`,
  hexagons: (s) =>
    `M ${s},0 l ${s},0 l ${s / 2},${(s * Math.sqrt(3)) / 2} l ${-s / 2},${(s * Math.sqrt(3)) / 2} l ${-s},0 l ${-s / 2},${(-s * Math.sqrt(3)) / 2} Z M 0,${s * Math.sqrt(3)} l ${s / 2},0 M ${3 * s},${s * Math.sqrt(3)} l ${-s / 2},0`,
};

const NAME_RE = /^[A-Za-z][\w-]*$/;

/** The textures a spec declares, by name; invalid names are dropped. */
export function texturesOf(spec: AnySpec): Record<string, TextureDef> {
  const agate = (spec.usermeta as { agate?: { textures?: unknown } } | undefined)?.agate;
  const raw = agate?.textures;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, TextureDef> = {};
  for (const [name, def] of Object.entries(raw as Record<string, unknown>)) {
    if (NAME_RE.test(name) && def && typeof def === "object") out[name] = def;
  }
  return out;
}

/** What a texture looks like as one colour, for the canvas renderer. */
function flatColor(def: TextureDef): string {
  return def.background ?? (def.type === "circles" ? def.fill : def.stroke) ?? "#343434";
}

/**
 * Rewrite every `url(#name)` of a declared texture in the spec: to a page-unique id for SVG
 * (several charts on one page must not share ids), or to its flat colour for canvas.
 */
export function bindTextures(spec: AnySpec, textures: Record<string, TextureDef>, prefix: string | null): AnySpec {
  const names = Object.keys(textures);
  if (names.length === 0) return spec;
  const re = new RegExp(`url\\(#(${names.join("|")})\\)`, "g");
  const swap = (s: string) =>
    s.replace(re, (_, name: string) => (prefix === null ? flatColor(textures[name]) : `url(#${prefix}-${name})`));
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.includes("url(#") ? swap(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) o[k] = k === "usermeta" ? x : walk(x);
      return o;
    }
    return v;
  };
  return walk(spec) as AnySpec;
}

/** Path for one line orientation in an s×s tile, as textures.js draws it. */
function linePath(orientation: string, s: number): string | null {
  switch (orientation) {
    case "0/8":
    case "vertical":
      return `M ${s / 2},0 l 0,${s}`;
    case "4/8":
    case "horizontal":
      return `M 0,${s / 2} l ${s},0`;
    case "2/8":
    case "diagonal":
      return `M 0,${s} l ${s},${-s} M ${-s / 4},${s / 4} l ${s / 2},${-s / 2} M ${(3 * s) / 4},${(5 * s) / 4} l ${s / 2},${-s / 2}`;
    case "6/8":
      return `M 0,0 l ${s},${s} M ${-s / 4},${(3 * s) / 4} l ${s / 2},${s / 2} M ${(3 * s) / 4},${-s / 4} l ${s / 2},${s / 2}`;
    case "1/8":
      return `M ${s / 4},0 l ${s / 2},${s} M ${-s / 4},0 l ${s / 2},${s} M ${(3 * s) / 4},0 l ${s / 2},${s}`;
    case "3/8":
      return `M 0,${(3 * s) / 4} l ${s},${-s / 2} M 0,${s / 4} l ${s},${-s / 2} M 0,${(5 * s) / 4} l ${s},${-s / 2}`;
    case "5/8":
      return `M 0,${-s / 4} l ${s},${s / 2} M 0,${s / 4} l ${s},${s / 2} M 0,${(3 * s) / 4} l ${s},${s / 2}`;
    case "7/8":
      return `M ${-s / 4},0 l ${s / 2},${-s} M ${s / 4},${s} l ${s / 2},${-s} M ${(3 * s) / 4},${s} l ${s / 2},${-s}`;
    default:
      return null;
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

function el(doc: Document, tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = doc.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/**
 * One `<pattern>` for a texture, and its turbulence `<filter>` when it is `rough`. Unknown
 * orientations and path names are skipped.
 */
export function patternElements(doc: Document, id: string, def: TextureDef): SVGElement[] {
  const s = def.size ?? 20;
  // textures.js tiles hexagons on a 3s × s√3 grid; everything else is square.
  const hex = def.type === "paths" && def.d === "hexagons";
  const w = hex ? 3 * s : s;
  const h = hex ? s * Math.sqrt(3) : s;
  const p = el(doc, "pattern", { id, patternUnits: "userSpaceOnUse", width: w, height: h });
  if (def.background) p.appendChild(el(doc, "rect", { width: w, height: h, fill: def.background }));
  const ink = el(doc, "g", def.shapeRendering ? { "shape-rendering": def.shapeRendering } : {});
  p.appendChild(ink);
  const out: SVGElement[] = [p];
  if (def.rough) {
    // In user space, not the bounding box: a horizontal or vertical line has a zero-height box, which would clip it away.
    const f = el(doc, "filter", { id: `${id}-rough`, filterUnits: "userSpaceOnUse", x: -w, y: -h, width: 3 * w, height: 3 * h });
    f.appendChild(el(doc, "feTurbulence", { type: "fractalNoise", baseFrequency: 0.35, numOctaves: 2, seed: 3, result: "noise" }));
    f.appendChild(el(doc, "feDisplacementMap", { in: "SourceGraphic", in2: "noise", scale: def.rough, xChannelSelector: "R", yChannelSelector: "G" }));
    ink.setAttribute("filter", `url(#${id}-rough)`);
    out.push(f);
  }
  const stroke = def.stroke ?? "#343434";
  const strokeWidth = def.strokeWidth ?? 2;
  if (def.type === "circles") {
    const r = def.radius ?? 2;
    const fill = def.fill ?? "#343434";
    ink.appendChild(el(doc, "circle", { cx: s / 2, cy: s / 2, r, fill }));
    if (def.complement) {
      for (const [cx, cy] of [[0, 0], [0, s], [s, 0], [s, s]]) ink.appendChild(el(doc, "circle", { cx, cy, r, fill }));
    }
  } else if (def.type === "paths") {
    const named = def.d ? PATHS[def.d] : undefined;
    const d = named ? named(s) : def.d?.replace(/\{s\}/g, String(s));
    if (d) ink.appendChild(el(doc, "path", { d, fill: def.fill ?? "transparent", stroke, "stroke-width": strokeWidth, "stroke-linecap": "square" }));
  } else {
    const orientations = Array.isArray(def.orientation) ? def.orientation : [def.orientation ?? "diagonal"];
    for (const o of orientations) {
      const d = linePath(o, s);
      if (d) ink.appendChild(el(doc, "path", { d, fill: "none", stroke, "stroke-width": strokeWidth, "stroke-linecap": "square" }));
    }
  }
  return out;
}

/** A zero-size `<svg>` holding the patterns, placed next to the chart so `url(#…)` resolves. */
export function texturesSvg(doc: Document, textures: Record<string, TextureDef>, prefix: string): SVGElement {
  const svg = el(doc, "svg", { width: 0, height: 0, "aria-hidden": "true", class: "agate-textures" });
  const defs = el(doc, "defs", {});
  for (const [name, def] of Object.entries(textures)) {
    for (const e of patternElements(doc, `${prefix}-${name}`, def)) defs.appendChild(e);
  }
  svg.appendChild(defs);
  return svg;
}
