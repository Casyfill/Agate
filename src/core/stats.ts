import { parse, View, type Config, type Loader } from "vega";
import { compile } from "vega-lite";
import type { AnySpec } from "./types";
import { agateMeta } from "./usermeta";

/**
 * Experimental: stats as HTML. A spec with `usermeta.agate.output: "stats"` is run headlessly and
 * the rows behind its first mark (`value`, `label`, optional `note`, `change`, `better`, `size`, `tone`, `class`) are shown
 * as a row of big numbers in note text instead of a chart. Vega does the aggregating; the note gets real text that
 * wraps, selects and uses the note's fonts. Outside Agate the spec still draws its own marks.
 */
export interface Stat {
  value: string;
  label: string;
  note?: string;
  /** Secondary value, e.g. the change since last month. The arrow (CSS) shows the direction, so a rise has no "+". */
  change?: string;
  direction?: "up" | "down" | "flat";
  /** Whether the direction is good news: up by default, down when the row says `better: "down"`. */
  good?: boolean;
  /** `size: "small"` on the row: a secondary number, on a line below the big ones. */
  small?: boolean;
  /** CSS variable for the value's colour, from the row's `tone`. */
  tone?: string;
  /** Extra classes for the cell, from the row's `class`, for snippets. */
  classes?: string[];
}

/**
 * `tone` names: the meanings, then the same colour names as the `agateColors` signal, so a
 * spec uses one vocabulary for charts and numbers. All are Obsidian theme variables, so they
 * follow light/dark and community themes.
 */
const TONES: Record<string, string> = {
  good: "--color-green",
  bad: "--color-red",
  warn: "--color-orange",
  muted: "--text-muted",
  accent: "--color-accent",
  text: "--text-normal",
  faint: "--text-faint",
  ...Object.fromEntries(["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"].map((c) => [c, `--color-${c}`])),
};

/** A row's `tone` and `class`, keeping only known tones and class names that are safe as written. */
export function lookOf(tone: unknown, cls: unknown): Pick<Stat, "tone" | "classes"> {
  const out: Pick<Stat, "tone" | "classes"> = {};
  if (typeof tone === "string" && Object.prototype.hasOwnProperty.call(TONES, tone)) out.tone = TONES[tone];
  const classes = typeof cls === "string" ? cls.split(/\s+/).filter((c) => /^[A-Za-z_][\w-]*$/.test(c)) : [];
  if (classes.length > 0) out.classes = classes;
  return out;
}

/** A row's `change`: a number gives the direction by its sign; a string by its leading + or −. */
export function changeOf(raw: unknown, better: unknown): Pick<Stat, "change" | "direction" | "good"> {
  if (raw == null || raw === "") return {};
  let change: string;
  let direction: Stat["direction"];
  if (typeof raw === "number") {
    direction = raw > 0 ? "up" : raw < 0 ? "down" : "flat";
    const size = Math.abs(raw).toLocaleString(undefined, { maximumFractionDigits: 2 });
    change = (raw < 0 ? "−" : raw === 0 ? "±" : "") + size;
  } else {
    const text = show(raw).trim();
    direction = text.startsWith("+") ? "up" : /^[-−]/.test(text) ? "down" : "flat";
    change = direction === "up" ? text.slice(1) : text;
  }
  const good = direction === "flat" ? undefined : direction === (better === "down" ? "down" : "up");
  return { change, direction, ...(good === undefined ? {} : { good }) };
}

export function isStatsSpec(spec: AnySpec): boolean {
  return agateMeta(spec)?.output === "stats";
}

/** The dataset feeding the first non-group mark of a Vega spec, searching groups depth first. */
export function firstMarkData(vg: unknown): string | null {
  const marks = (vg as { marks?: Array<{ type?: string; from?: { data?: string } }> } | null)?.marks ?? [];
  for (const m of marks) {
    if (m.type !== "group" && m.from?.data) return m.from.data;
    const inner = firstMarkData(m);
    if (inner) return inner;
  }
  return null;
}

const show = (v: unknown): string =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : typeof v === "string" || typeof v === "boolean"
      ? String(v)
      : v instanceof Date
        ? v.toLocaleDateString()
        : "";

/** Run the spec without a renderer and read its stats rows. */
export async function computeStats(spec: AnySpec, mode: "vega" | "vega-lite", config: Config, loader?: Loader): Promise<Stat[]> {
  const vg = (mode === "vega-lite" ? compile(spec as never, { config: config as never }).spec : spec) as never;
  const view = new View(parse(vg, mode === "vega" ? config : undefined), { renderer: "none", loader });
  try {
    await view.runAsync();
    const name = firstMarkData(vg);
    if (!name) throw new Error('A stats spec needs a mark whose rows carry "value" and "label".');
    return (view.data(name) as Array<Record<string, unknown>>).map((r) => ({
      value: show(r.value),
      label: show(r.label),
      ...(r.note != null ? { note: show(r.note) } : {}),
      ...changeOf(r.change, r.better),
      ...(r.size === "small" ? { small: true } : {}),
      ...lookOf(r.tone, r.class),
    }));
  } finally {
    view.finalize();
  }
}

/**
 * Draw stats into `el` as HTML numbers, or pass null when `el` holds a chart: either way the
 * base block, embed or view around it is marked, so styles.css can drop the fixed height
 * around stats (the header is the view's explicit `header` option). A class instead of `:has()`, which makes the browser re-check
 * selectors across the whole document on every DOM change.
 */
export function renderStats(el: HTMLElement, stats: Stat[] | null): void {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.matches(".block-language-base, .bases-embed, .agate-bases-view")) p.classList.toggle("agate-has-stats", stats !== null);
  }
  if (!stats) return;
  // Plain DOM rather than Obsidian's createDiv helpers, so this runs (and is tested) outside Obsidian.
  const add = (parent: HTMLElement, tag: string, cls: string, text?: string): HTMLElement => {
    const child = parent.ownerDocument.createElement(tag);
    child.className = cls;
    if (text !== undefined) child.textContent = text;
    parent.appendChild(child);
    return child;
  };
  el.replaceChildren();
  el.classList.add("agate-stats");
  const cell = (parent: HTMLElement, s: Stat): void => {
    const c = add(parent, "div", ["agate-stat", ...(s.classes ?? []), ...(s.tone ? ["has-tone"] : [])].join(" "));
    if (s.tone) c.style.setProperty("--agate-stat-tone", `var(${s.tone})`);
    const top = add(c, "div", "agate-stat-top");
    add(top, "span", "agate-stat-value", s.value);
    if (s.change) {
      const cls = ["agate-stat-change", `is-${s.direction ?? "flat"}`];
      if (s.good !== undefined) cls.push(s.good ? "is-good" : "is-bad");
      add(top, "span", cls.join(" "), s.change);
    }
    add(c, "div", "agate-stat-label", s.label);
    if (s.note) add(c, "div", "agate-stat-note", s.note);
  };
  for (const s of stats) if (!s.small) cell(el, s);
  // Small rows go on their own line below the big ones, wherever they sit in the data.
  const small = stats.filter((s) => s.small);
  if (small.length > 0) {
    const minor = add(el, "div", "agate-stats-minor");
    for (const s of small) cell(minor, s);
  }
}
