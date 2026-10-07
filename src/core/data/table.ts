import type { AnySpec, Row } from "../types";
import { getProperty } from "./rowdata";

/**
 * Table cells (ADR-0001 D12): a spec that wants to draw the Bases view as a table, with
 * a chart as one of the columns, asks for a `cells` dataset. Agate fills it with one record
 * per row and visible property (the Properties menu, in its order), so the columns follow
 * what the user shows and hides in Bases.
 *
 *   "usermeta": { "agate": { "cells": "cells" } }
 */
export function cellsDatasetName(spec: AnySpec): string | null {
  const meta = spec.usermeta as Record<string, unknown> | undefined;
  const agate = meta && typeof meta === "object" ? (meta.agate as Record<string, unknown> | undefined) : undefined;
  const name = agate && typeof agate === "object" ? agate.cells : undefined;
  if (name === undefined) return null;
  if (typeof name !== "string" || !name.trim()) throw new Error("usermeta.agate.cells must be a dataset name.");
  return name.trim();
}

/** `fred` → `note.fred`; ids that already carry a type pass through. */
export function normalizePropertyId(id: string): string {
  return /^(note|formula|file)\./.test(id) ? id : `note.${id}`;
}

/** Display text for a converted value: what a table cell should say. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(cellText).filter((s) => s.length > 0).join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "bigint") return String(value);
  return JSON.stringify(value) ?? "";
}

/**
 * One record per (row, column): `rowIndex` and `column` are positions, `property` the
 * Bases id, `label` its display name, `value` the converted value and `text` its display
 * form. `file` is copied so a spec can link or label by it.
 */
export function tableCells(rows: Row[], order: string[], label: (id: string) => string): Row[] {
  const ids = order.map(normalizePropertyId);
  const cells: Row[] = [];
  rows.forEach((row, rowIndex) => {
    ids.forEach((id, column) => {
      const value = getProperty(row, id) ?? null;
      cells.push({ rowIndex, column, property: id, label: label(id), value, text: cellText(value), file: row.file });
    });
  });
  return cells;
}
