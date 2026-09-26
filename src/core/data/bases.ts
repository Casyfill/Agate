import {
  BooleanValue,
  DateValue,
  DurationValue,
  FileValue,
  LinkValue,
  ListValue,
  NullValue,
  NumberValue,
  ObjectValue,
  StringValue,
  Value,
  parsePropertyId,
  type BasesEntry,
  type BasesEntryGroup,
  type BasesPropertyId,
} from "obsidian";
import type { Row } from "../types";
import type { Logger } from "../../util/log";

/**
 * Convert Bases entries into Vega rows (ADR-0001 D4).
 *
 * Row shape mirrors Bases property ids so a Vega field string equals what the user
 * sees in Bases: `note.rating`, `file.name`, `formula.age`. `group` is set when the
 * view is grouped.
 */
export function groupsToRows(
  groups: BasesEntryGroup[],
  properties: BasesPropertyId[],
  log?: Logger,
): Row[] {
  const rows: Row[] = [];
  let dumped = false;
  for (const group of groups) {
    const groupKey = group.hasKey() && group.key ? valueToJson(group.key) : undefined;
    for (const entry of group.entries) {
      if (!dumped && log) {
        dumpEntry(entry, properties, log);
        dumped = true;
      }
      const row = entryToRow(entry, properties);
      if (groupKey !== undefined) row.group = groupKey;
      rows.push(row);
    }
  }
  return rows;
}

export function entryToRow(entry: BasesEntry, properties: BasesPropertyId[]): Row {
  const f = entry.file;
  const stat = f.stat;
  const file: Record<string, unknown> = {
    name: f.basename,
    path: f.path,
    ext: f.extension,
    folder: f.parent?.path ?? "",
    ctime: stat ? new Date(stat.ctime).toISOString() : null,
    mtime: stat ? new Date(stat.mtime).toISOString() : null,
    size: stat ? stat.size : null,
  };
  const note: Record<string, unknown> = {};
  const formula: Record<string, unknown> = {};

  for (const prop of properties) {
    const { type, name } = safeParse(prop);
    let value: Value | null = null;
    try {
      value = entry.getValue(prop);
    } catch {
      value = null;
    }
    const json = valueToJson(value);
    if (type === "file") {
      // name/path/ext/folder/ctime/mtime/size are already set from TFile in a chart-friendly
      // form (basename, ISO dates). Only add what Bases knows and we do not: tags, links, …
      if (!(name in file)) file[name] = json;
    } else if (type === "formula") {
      formula[name] = json;
    } else {
      note[name] = json;
    }
  }

  return { file, note, formula };
}

function safeParse(prop: BasesPropertyId): { type: string; name: string } {
  try {
    return parsePropertyId(prop);
  } catch {
    const i = prop.indexOf(".");
    return i > 0 ? { type: prop.slice(0, i), name: prop.slice(i + 1) } : { type: "note", name: prop };
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_SPACE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)$/;

/**
 * Map a Bases Value to plain JSON (D4 table). Public typings expose only toString()
 * and a few accessors, so this goes through them and peeks at well-known runtime
 * fields when present. Debug logging shows which path was taken.
 */
export function valueToJson(value: Value | null | undefined): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof NullValue) return null;

  if (value instanceof BooleanValue) {
    const raw = peek(value, ["value", "data"]);
    if (typeof raw === "boolean") return raw;
    return value.toString().trim().toLowerCase() === "true";
  }

  if (value instanceof NumberValue) {
    const raw = peek(value, ["value", "data"]);
    if (typeof raw === "number") return raw;
    const n = Number(value.toString());
    return Number.isFinite(n) ? n : null;
  }

  if (value instanceof DateValue) {
    const raw = peek(value, ["date", "value", "data", "time"]);
    if (raw instanceof Date) return raw.toISOString();
    if (typeof raw === "number") return new Date(raw).toISOString();
    const s = value.toString().trim();
    if (DATE_ONLY.test(s)) return s;
    const m = DATE_TIME_SPACE.exec(s);
    if (m) return `${m[1]}T${m[2]}`;
    return s;
  }

  if (value instanceof DurationValue) {
    try {
      return value.getMilliseconds();
    } catch {
      return value.toString();
    }
  }

  if (value instanceof ListValue) {
    const out: unknown[] = [];
    const n = value.length();
    for (let i = 0; i < n; i++) out.push(valueToJson(value.get(i)));
    return out;
  }

  if (value instanceof LinkValue) {
    const raw = peek(value, ["path", "linkpath", "link", "target"]);
    if (typeof raw === "string") return raw;
    // Fallback: "[[path|display]]" -> "path"
    return value
      .toString()
      .replace(/^\[\[|\]\]$/g, "")
      .split("|")[0];
  }

  if (value instanceof FileValue) {
    const raw = peek(value, ["path", "file"]);
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object" && typeof (raw as { path?: unknown }).path === "string") {
      return (raw as { path: string }).path;
    }
    return value.toString();
  }

  if (value instanceof StringValue) {
    const raw = peek(value, ["value", "data"]);
    return typeof raw === "string" ? raw : value.toString();
  }

  if (value instanceof ObjectValue) {
    const raw = peek(value, ["value", "data"]);
    if (raw && typeof raw === "object") {
      try {
        return JSON.parse(JSON.stringify(raw));
      } catch {
        /* fall through */
      }
    }
    const s = value.toString();
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }

  // ErrorValue and anything else not in the public typings.
  try {
    return value.toString();
  } catch {
    return null;
  }
}

function peek(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    if (k in rec && rec[k] !== undefined) return rec[k];
  }
  return undefined;
}

/** Runtime shape of every Value on one entry, so we learn what the public typings hide (M0). */
export function describeEntry(entry: BasesEntry, properties: BasesPropertyId[]): Record<string, unknown> {
  const shapes: Record<string, unknown> = {};
  for (const prop of properties) {
    let v: Value | null = null;
    try {
      v = entry.getValue(prop);
    } catch (e) {
      shapes[prop] = { error: String(e) };
      continue;
    }
    if (v === null) {
      shapes[prop] = null;
      continue;
    }
    let str: string;
    try {
      str = v.toString();
    } catch (e) {
      str = `toString threw: ${String(e)}`;
    }
    shapes[prop] = {
      ctor: (v as object).constructor?.name,
      keys: Object.keys(v as object),
      toString: str,
      json: valueToJson(v),
    };
  }
  return shapes;
}

function dumpEntry(entry: BasesEntry, properties: BasesPropertyId[], log: Logger): void {
  log.debug("first entry", entry.file.path, describeEntry(entry, properties));
}
