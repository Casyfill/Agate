import type { AgateEnvelope } from "./types";

/** Keys copied from the referenced base view into the synthesized agate view. */
const VIEW_KEYS = ["filters", "order", "groupBy", "limit", "sort", "summaries"] as const;
/** Keys copied from the base file's top level. */
const BASE_KEYS = ["filters", "formulas", "properties", "summaries"] as const;
/** Envelope keys that become agate view options. */
const OPTION_KEYS = ["dataset", "theme", "renderer", "actions", "interactive"] as const;

export interface SynthesizeInput {
  /** Parsed contents of the .base file. */
  baseConfig: Record<string, unknown>;
  /** Basename of the .base file, used for the synthesized view's name. */
  baseName: string;
  /** The ```agate envelope. */
  envelope: AgateEnvelope;
  /** Vault path of the spec file when `envelope.spec` is a string; already resolved against the note. */
  resolvedSpecPath?: string | null;
  /** View type id registered by Agate. */
  viewType: string;
}

/**
 * Build the object for a ```base block that carries the base's query plus one agate view
 * holding this block's spec (ADR-0001 D3, Surface B → A). Pure: no vault access.
 */
export function synthesizeBaseConfig(input: SynthesizeInput): Record<string, unknown> {
  const { baseConfig, envelope, viewType } = input;
  const views = Array.isArray(baseConfig.views) ? (baseConfig.views as Array<Record<string, unknown>>) : [];

  let sourceView: Record<string, unknown> | undefined;
  if (envelope.view) {
    sourceView = views.find((v) => v && v.name === envelope.view);
    if (!sourceView) {
      const names = views
        .map((v) => (v ? v.name : undefined))
        .filter((n): n is string => typeof n === "string")
        .join(", ");
      throw new Error(`View "${envelope.view}" not found. Views: ${names || "(none)"}`);
    }
  }

  const agateView: Record<string, unknown> = { type: viewType, name: `Agate (${input.baseName})` };
  if (sourceView) {
    for (const key of VIEW_KEYS) if (sourceView[key] !== undefined) agateView[key] = sourceView[key];
  }

  if (typeof envelope.spec === "string") {
    if (!input.resolvedSpecPath) throw new Error(`Spec file not found: ${envelope.spec}`);
    agateView.specFile = input.resolvedSpecPath;
  } else if (envelope.spec && typeof envelope.spec === "object") {
    agateView.spec = envelope.spec;
  } else {
    throw new Error("Block needs a spec next to `base:`: either inline or `spec: path/to/file.json`.");
  }

  for (const key of OPTION_KEYS) if (envelope[key] !== undefined) agateView[key] = envelope[key];

  const out: Record<string, unknown> = {};
  for (const key of BASE_KEYS) if (baseConfig[key] !== undefined) out[key] = baseConfig[key];
  out.views = [agateView];
  return out;
}
