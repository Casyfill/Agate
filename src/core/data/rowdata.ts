import { read } from "vega";
import type { AnySpec, Row } from "../types";

/**
 * Per-row data (ADR-0001 D12): a spec asks for one extra dataset built by following a
 * property on every base row. The property holds a vault path, a link, a URL, or a list;
 * Agate loads each one and emits the records with the parent row's fields attached, so a
 * spec can draw one small chart per note (facet or group by `file.name`).
 *
 * Declared in the spec, so it travels with the spec file:
 *
 *   "usermeta": { "agate": { "rowData": { "name": "series", "from": "formula.csv" } } }
 */
export interface RowDataDef {
  /** Dataset name the expanded records go into. */
  name: string;
  /** Property id on the base row (`note.data`, `formula.csv`, `file.path`). */
  from: string;
  /** Vega format for the loaded text. Inferred from the extension when omitted. */
  format?: Record<string, unknown>;
}

/** Keys the parent row contributes to each record; loaded columns with these names are overwritten. */
export const PARENT_KEYS = ["file", "note", "formula", "group", "rowIndex"] as const;

/** Read and validate `usermeta.agate.rowData` (one definition or a list). Throws on malformed input. */
export function rowDataDefs(spec: AnySpec): RowDataDef[] {
  const meta = spec.usermeta as Record<string, unknown> | undefined;
  const agate = meta && typeof meta === "object" ? (meta.agate as Record<string, unknown> | undefined) : undefined;
  const raw = agate && typeof agate === "object" ? agate.rowData : undefined;
  if (raw === undefined) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((d, i) => {
    const where = `usermeta.agate.rowData${Array.isArray(raw) ? `[${i}]` : ""}`;
    if (!d || typeof d !== "object") throw new Error(`${where} must be an object with "name" and "from".`);
    const def = d as Record<string, unknown>;
    if (typeof def.name !== "string" || !def.name.trim()) throw new Error(`${where}.name must be a dataset name.`);
    if (typeof def.from !== "string" || !/^(note|formula|file)\.\S+$/.test(def.from)) {
      throw new Error(`${where}.from must be a property id such as "note.data" or "formula.csv".`);
    }
    const format = def.format && typeof def.format === "object" ? (def.format as Record<string, unknown>) : undefined;
    return { name: def.name.trim(), from: def.from, format };
  });
}

/** `note.data` → row.note.data. Property names may contain dots, so only the first one splits. */
export function getProperty(row: Row, id: string): unknown {
  const i = id.indexOf(".");
  const group = row[id.slice(0, i)];
  if (!group || typeof group !== "object") return undefined;
  return (group as Record<string, unknown>)[id.slice(i + 1)];
}

/** Turn a property value into something loadable: strip wikilink brackets and aliases. */
export function toUri(value: string): string {
  const s = value.trim();
  const m = /^!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/.exec(s);
  return m ? m[1].trim() : s;
}

/** csv / tsv / json from the extension, ignoring query and hash; content sniffing otherwise. */
export function inferFormat(uri: string, text: string): Record<string, unknown> {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".json") || path.endsWith(".geojson")) return { type: "json" };
  if (path.endsWith(".tsv")) return { type: "tsv", parse: "auto" };
  if (path.endsWith(".csv")) return { type: "csv", parse: "auto" };
  const head = text.trimStart()[0];
  if (head === "[" || head === "{") return { type: "json" };
  return { type: "csv", parse: "auto" };
}

/**
 * In-memory cache of loaded text, keyed by URI. Only remote URLs are cached: vault files
 * are cheap to read and may have just changed. Failed loads are not kept.
 */
export class RowDataCache {
  private entries = new Map<string, { at: number; text: Promise<string> }>();

  constructor(
    private readonly ttlMs = 10 * 60 * 1000,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 500,
  ) {}

  get(uri: string, load: (uri: string) => Promise<string>): Promise<string> {
    if (!/^https?:/i.test(uri)) return load(uri);
    const hit = this.entries.get(uri);
    if (hit && this.now() - hit.at < this.ttlMs) return hit.text;
    const text = load(uri);
    this.entries.set(uri, { at: this.now(), text });
    text.catch(() => {
      if (this.entries.get(uri)?.text === text) this.entries.delete(uri);
    });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    return text;
  }

  clear(): void {
    this.entries.clear();
  }
}

export interface ExpandDeps {
  /** Loads a vault path or URL to text (Agate's vault loader). */
  load: (uri: string) => Promise<string>;
  cache?: RowDataCache;
  /** Parallel loads. */
  concurrency?: number;
}

export interface ExpandResult {
  records: Row[];
  /** One line per row that failed, `path: message`. */
  errors: string[];
}

/** Records for one row's value, before the parent fields are attached. */
async function recordsFor(value: unknown, def: RowDataDef, deps: ExpandDeps): Promise<Row[]> {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return (value as unknown[]).map((v, index) =>
      v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Row) } : { index, value: v },
    );
  }
  if (typeof value !== "string") throw new Error(`expected a path, URL or list, got ${typeof value}`);
  const uri = toUri(value);
  const text = deps.cache ? await deps.cache.get(uri, deps.load) : await deps.load(uri);
  const format = def.format ?? inferFormat(uri, text);
  const parsed = read(text, format as never) as unknown[];
  return parsed.map((r) => (r && typeof r === "object" ? (r as Row) : { value: r }));
}

/**
 * Build the per-row dataset: for each base row, load what `def.from` points at and copy the
 * row's `file`, `note`, `formula`, `group` and its position (`rowIndex`) onto every record.
 * Records come out in base row order, so the Bases sort menu orders the small charts.
 * A row that fails to load is reported in `errors` and contributes nothing.
 */
export async function expandRowData(rows: Row[], def: RowDataDef, deps: ExpandDeps): Promise<ExpandResult> {
  const perRow: Row[][] = new Array<Row[]>(rows.length);
  const errors: string[] = [];
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < rows.length) {
      const i = next++;
      const row = rows[i];
      try {
        const parent: Row = { file: row.file, note: row.note, formula: row.formula, rowIndex: i };
        if (row.group !== undefined) parent.group = row.group;
        const recs = await recordsFor(getProperty(row, def.from), def, deps);
        perRow[i] = recs.map((r) => ({ ...r, ...parent }));
      } catch (err) {
        const path = (row.file as { path?: string } | undefined)?.path ?? `row ${i}`;
        errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
        perRow[i] = [];
      }
    }
  };

  const n = Math.max(1, Math.min(deps.concurrency ?? 6, rows.length));
  await Promise.all(Array.from({ length: n }, worker));
  return { records: perRow.flat(), errors };
}
