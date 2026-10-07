import type { AnySpec, Row } from "../types";

/**
 * Structure datasets (ADR-0001 D12): links between the notes of a base, and the folder
 * hierarchy they sit in. Vega has the layouts (force, arc diagrams, partition, treemap,
 * tree) but cannot see the vault, so Agate supplies the shape:
 *
 *   "usermeta": { "agate": { "edges": "edges", "tree": "tree" } }
 */

function agateMeta(spec: AnySpec): Record<string, unknown> | undefined {
  const meta = spec.usermeta as Record<string, unknown> | undefined;
  const agate = meta && typeof meta === "object" ? meta.agate : undefined;
  return agate && typeof agate === "object" ? (agate as Record<string, unknown>) : undefined;
}

function datasetName(spec: AnySpec, key: string): string | null {
  const v = agateMeta(spec)?.[key];
  if (v === undefined) return null;
  if (typeof v !== "string" || !v.trim()) throw new Error(`usermeta.agate.${key} must be a dataset name.`);
  return v.trim();
}

export const edgesDatasetName = (spec: AnySpec): string | null => datasetName(spec, "edges");
export const treeDatasetName = (spec: AnySpec): string | null => datasetName(spec, "tree");

const pathOf = (row: Row): string | undefined => (row.file as { path?: string } | undefined)?.path;
const nameOf = (row: Row): string => (row.file as { name?: string } | undefined)?.name ?? "";

/**
 * Links between rows of the base, from Obsidian's resolved link index
 * (`metadataCache.resolvedLinks`: source path → target path → count). Only links whose
 * target is also in the base are kept; self-links are dropped. `source`/`target` are row
 * positions (`rowIndex` in other Agate datasets), so Vega's force transform can use them
 * as indices into the node data.
 */
export function linkEdges(rows: Row[], resolved: Record<string, Record<string, number>>): Row[] {
  const index = new Map<string, number>();
  rows.forEach((r, i) => {
    const p = pathOf(r);
    if (p) index.set(p, i);
  });
  const edges: Row[] = [];
  rows.forEach((row, source) => {
    const from = pathOf(row);
    const targets = from ? resolved[from] : undefined;
    if (!targets) return;
    for (const [to, count] of Object.entries(targets)) {
      const target = index.get(to);
      if (target === undefined || target === source) continue;
      edges.push({ source, target, count, sourceName: nameOf(row), targetName: nameOf(rows[target]), sourcePath: from, targetPath: to });
    }
  });
  return edges;
}

/**
 * The folder tree of the rows, ready for Vega's `stratify`: one node per folder (including
 * the vault root, id "/"; d3 treats an empty id as no id), one per row. Every node has `id`, `parent`, `name`, `depth`,
 * `kind` ("folder" | "file") and `ancestors` (ids from the root down, excluding itself), so a
 * spec can zoom into a folder by filtering on `ancestors`. Every node has `size` (bytes;
 * for a folder, the total of everything under it) and `count` (files under it, 1 for a
 * file), so a spec that cuts the tree at some depth still shows true totals. File nodes also
 * carry `rowIndex` and the row's `file`, `note`, `formula`.
 */
export function pathTree(rows: Row[], rootName = "Vault"): Row[] {
  const ROOT = "/";
  const folders = new Map<string, Row>();
  /** Folder ids are vault paths ("Ideas/Deep"); the root is "/". */
  const ancestorsOf = (parts: string[]): string[] => {
    const out = [ROOT];
    for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
    return out;
  };
  const folder = (path: string): string => {
    const id = path === "" ? ROOT : path;
    if (folders.has(id)) return id;
    const parts = path === "" ? [] : path.split("/");
    const parent = path === "" ? null : folder(parts.slice(0, -1).join("/"));
    folders.set(id, {
      id,
      parent,
      name: path === "" ? rootName : parts[parts.length - 1],
      depth: parts.length,
      kind: "folder",
      ancestors: path === "" ? [] : ancestorsOf(parts),
      size: 0,
      count: 0,
    });
    return id;
  };
  folder("");

  const files: Row[] = [];
  rows.forEach((row, rowIndex) => {
    const path = pathOf(row);
    if (!path) return;
    const parts = path.split("/");
    const parent = folder(parts.slice(0, -1).join("/"));
    const ancestors = ancestorsOf(parts);
    const raw = (row.file as { size?: unknown }).size;
    const size = typeof raw === "number" ? raw : 0;
    for (const a of ancestors) {
      const f = folders.get(a)!;
      f.size = (f.size as number) + size;
      f.count = (f.count as number) + 1;
    }
    files.push({
      id: path,
      parent,
      name: nameOf(row) || parts[parts.length - 1],
      depth: parts.length,
      kind: "file",
      ancestors,
      size,
      count: 1,
      rowIndex,
      file: row.file,
      note: row.note,
      formula: row.formula,
    });
  });
  return [...folders.values(), ...files];
}
