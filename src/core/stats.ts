import { parse, View, type Config, type Loader } from "vega";
import { compile } from "vega-lite";
import type { AnySpec } from "./types";
import { agateMeta } from "./usermeta";

/**
 * Experimental: stats as HTML. A spec with `usermeta.agate.output: "stats"` is run headlessly and
 * the rows behind its first mark (`value`, `label`, optional `note`, `change`, `better`) are shown
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
    }));
  } finally {
    view.finalize();
  }
}

/**
 * Draw stats into `el` as HTML numbers, or pass null when `el` holds a chart: either way the
 * base block, embed or view around it is marked, so styles.css can drop the Bases header and
 * fixed height around stats. A class instead of `:has()`, which makes the browser re-check
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
  for (const s of stats) {
    const cell = add(el, "div", "agate-stat");
    const top = add(cell, "div", "agate-stat-top");
    add(top, "span", "agate-stat-value", s.value);
    if (s.change) {
      const cls = ["agate-stat-change", `is-${s.direction ?? "flat"}`];
      if (s.good !== undefined) cls.push(s.good ? "is-good" : "is-bad");
      add(top, "span", cls.join(" "), s.change);
    }
    add(cell, "div", "agate-stat-label", s.label);
    if (s.note) add(cell, "div", "agate-stat-note", s.note);
  }
}
