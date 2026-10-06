import type { AnySpec, Row } from "./types";
import { getProperty } from "./data/rowdata";

/**
 * Recipes (ADR-0001 D13): a spec plus the properties it needs, so a first chart is
 * "pick a recipe, pick which property is the date" rather than writing JSON.
 *
 * A recipe is an ordinary Vega or Vega-Lite spec with `usermeta.agate.recipe` and
 * placeholders where field names go:
 *
 *   "{{date}}"       → the chosen property id, e.g. "note.published" (for `field`)
 *   "{{date.expr}}"  → a safe expression accessor, e.g. datum["note"]["published"]
 *   "{{date.label}}" → the property's display name (for titles); the role's label when unset
 *
 * An optional role left unset removes every object that holds one of its placeholders
 * as a whole value (typically an encoding channel), and `.expr` becomes `null`.
 */

export type PropertyType = "number" | "date" | "text" | "list" | "link" | "boolean";

export interface RecipeRole {
  label: string;
  /** Property types that fit; empty or missing means any. */
  types?: PropertyType[];
  optional?: boolean;
  /** Property names to prefer when suggesting, e.g. ["published", "date", "created"]. */
  prefer?: string[];
  description?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  roles: Record<string, RecipeRole>;
  /** The spec without its recipe metadata, still holding placeholders. */
  spec: AnySpec;
  /** "built-in" or the vault path the recipe came from. */
  source: string;
  /** File extension for the spec it produces. */
  extension: "vl.json" | "vg.json";
}

export interface PropertyInfo {
  id: string;
  label: string;
  type: PropertyType | null;
}

const ROLE_KEY = /^[A-Za-z][\w-]*$/;

/** Read a recipe from a spec, or null when the spec carries no `usermeta.agate.recipe`. Throws on a malformed one. */
export function parseRecipe(raw: AnySpec, source: string, fallbackId: string): Recipe | null {
  const meta = raw.usermeta as Record<string, unknown> | undefined;
  const agate = meta && typeof meta === "object" ? (meta.agate as Record<string, unknown> | undefined) : undefined;
  const r = agate && typeof agate === "object" ? (agate.recipe as Record<string, unknown> | undefined) : undefined;
  if (!r || typeof r !== "object") return null;
  if (typeof r.name !== "string" || !r.name.trim()) throw new Error(`${source}: usermeta.agate.recipe.name is required.`);
  const roles: Record<string, RecipeRole> = {};
  const rawRoles = (r.roles ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(rawRoles)) {
    if (!ROLE_KEY.test(key)) throw new Error(`${source}: role name "${key}" must be a plain word.`);
    const v = (value ?? {}) as Record<string, unknown>;
    roles[key] = {
      label: typeof v.label === "string" ? v.label : key,
      types: Array.isArray(v.types) ? (v.types.filter((t) => typeof t === "string") as PropertyType[]) : undefined,
      optional: v.optional === true,
      prefer: Array.isArray(v.prefer) ? v.prefer.filter((t): t is string => typeof t === "string") : undefined,
      description: typeof v.description === "string" ? v.description : undefined,
    };
  }
  const spec = JSON.parse(JSON.stringify(raw)) as AnySpec;
  const specAgate = (spec.usermeta as { agate: Record<string, unknown> }).agate;
  delete specAgate.recipe;
  const isVL = typeof spec.$schema === "string" && /vega-lite/.test(spec.$schema);
  return {
    id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : fallbackId,
    name: r.name.trim(),
    description: typeof r.description === "string" ? r.description : "",
    roles,
    spec,
    source,
    extension: isVL ? "vl.json" : "vg.json",
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const LINK = /^!?\[\[.+\]\]$/;

function typeOf(v: unknown): PropertyType | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (Array.isArray(v)) return "list";
  if (typeof v === "string") {
    if (ISO_DATE.test(v)) return "date";
    if (LINK.test(v.trim()) || /\.md$/.test(v)) return "link";
    return "text";
  }
  return null;
}

/** The most common non-empty type of each property across the rows. */
export function inferPropertyTypes(rows: Row[], ids: string[], label: (id: string) => string = (id) => id): PropertyInfo[] {
  return ids.map((id) => {
    const counts = new Map<PropertyType, number>();
    for (const row of rows) {
      const t = typeOf(getProperty(row, id));
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best: PropertyType | null = null;
    let n = 0;
    for (const [t, c] of counts) {
      if (c > n) {
        best = t;
        n = c;
      }
    }
    return { id, label: label(id), type: best };
  });
}

/** Properties that fit a role: matching type, or untyped when the role accepts anything. */
export function candidatesFor(role: RecipeRole, props: PropertyInfo[]): PropertyInfo[] {
  const types = role.types && role.types.length > 0 ? role.types : null;
  return props.filter((p) => !types || (p.type !== null && types.includes(p.type)) || (types.includes("text") && p.type === "link"));
}

/** A first guess per role: a preferred name if present, else the first fitting property not already used. */
export function suggestMapping(recipe: Recipe, props: PropertyInfo[]): Record<string, string | null> {
  const used = new Set<string>();
  const out: Record<string, string | null> = {};
  for (const [key, role] of Object.entries(recipe.roles)) {
    const fits = candidatesFor(role, props);
    const byName = (role.prefer ?? [])
      .map((name) => fits.find((p) => p.id.split(".").slice(1).join(".").toLowerCase() === name.toLowerCase()))
      .find((p) => p && !used.has(p.id));
    const pick = byName ?? (role.optional ? undefined : fits.find((p) => !used.has(p.id)));
    out[key] = pick ? pick.id : null;
    if (pick) used.add(pick.id);
  }
  return out;
}

/** `note.my rating` → `datum["note"]["my rating"]`, safe for any property name. */
export function exprAccessor(id: string): string {
  const i = id.indexOf(".");
  const parts = i > 0 ? [id.slice(0, i), id.slice(i + 1)] : [id];
  return "datum" + parts.map((p) => `[${JSON.stringify(p)}]`).join("");
}

/** Roles the mapping leaves empty although they are required. */
export function missingRoles(recipe: Recipe, mapping: Record<string, string | null>): string[] {
  return Object.entries(recipe.roles)
    .filter(([key, role]) => !role.optional && !mapping[key])
    .map(([key]) => key);
}

/**
 * The spec a recipe produces for a mapping (role → property id, or null). Records where it
 * came from under `usermeta.agate.fromRecipe` so a later version can offer to re-map.
 */
export function fillRecipe(
  recipe: Recipe,
  mapping: Record<string, string | null>,
  label: (id: string) => string = (id) => id.split(".").slice(1).join(".") || id,
): AnySpec {
  const missing = missingRoles(recipe, mapping);
  if (missing.length > 0) throw new Error(`Pick a property for: ${missing.map((k) => recipe.roles[k].label).join(", ")}`);

  const PLACEHOLDER = /\{\{([A-Za-z][\w-]*)(\.(expr|label))?\}\}/g;
  const isUnset = (s: string): boolean => {
    const m = /^\{\{([A-Za-z][\w-]*)(\.label)?\}\}$/.exec(s);
    return !!m && m[1] in recipe.roles && !mapping[m[1]];
  };
  const replace = (s: string): string =>
    s.replace(PLACEHOLDER, (whole, key: string, _dot, kind: string | undefined) => {
      if (!(key in recipe.roles)) return whole;
      const id = mapping[key];
      if (kind === "expr") return id ? exprAccessor(id) : "null";
      if (kind === "label") return id ? label(id) : recipe.roles[key].label;
      return id ?? "";
    });

  /** Returns undefined when the node should be dropped from its parent. */
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return replace(node);
    if (Array.isArray(node)) {
      const out: unknown[] = [];
      for (const item of node) {
        const v = walk(item);
        if (v !== undefined) out.push(v);
      }
      return out;
    }
    if (node && typeof node === "object") {
      const entries = Object.entries(node as Record<string, unknown>);
      if (entries.some(([, v]) => typeof v === "string" && isUnset(v))) return undefined;
      const out: Record<string, unknown> = {};
      for (const [k, v] of entries) {
        const w = walk(v);
        if (w !== undefined) out[k] = w;
      }
      return out;
    }
    return node;
  };

  const spec = walk(recipe.spec) as AnySpec;
  const usermeta = (spec.usermeta ?? {}) as Record<string, unknown>;
  const agate = (usermeta.agate ?? {}) as Record<string, unknown>;
  agate.fromRecipe = { id: recipe.id, roles: mapping };
  spec.usermeta = { ...usermeta, agate };
  return spec;
}

/** File-name friendly version of a recipe name plus the first mapped property, e.g. "timeline-published". */
export function suggestFileName(recipe: Recipe, mapping: Record<string, string | null>): string {
  const first = Object.values(mapping).find((v): v is string => !!v);
  const base = [recipe.id, first ? first.split(".").slice(1).join(".") : ""]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "chart"}.${recipe.extension}`;
}
