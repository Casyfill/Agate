import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGATE_KEYS, agateMeta, unknownAgateKeys } from "../../src/core/usermeta";
import { propertiesToConvert, resolveViewSpec } from "../../src/core/spec";

describe("usermeta.agate contract", () => {
  it("reads the agate object and flags unknown keys", () => {
    expect(agateMeta({ usermeta: { agate: [] } })).toBeUndefined();
    expect(unknownAgateKeys({ usermeta: { agate: { open: "click", rowdata: {}, texture: {} } } })).toEqual(["rowdata", "texture"]);
    expect(unknownAgateKeys({ mark: "bar" })).toEqual([]);
  });

  it("lists every key the source reads", () => {
    // Guards the one-table rule: a new agateMeta(spec)?.key or datasetName(spec, "key") must be added to AGATE_KEYS.
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith(".ts") ? [join(dir, f)] : []));
    const used = new Set<string>();
    for (const f of files("src")) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/agateMeta\([^)]*\)\?\.(\w+)/g)) used.add(m[1]);
      for (const m of text.matchAll(/datasetName\(spec, "(\w+)"\)/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(5);
    for (const k of used) expect(AGATE_KEYS).toHaveProperty(k);
  });
});

describe("Bases view decisions in core", () => {
  const spec = { encoding: { x: { field: "note.rating" }, y: { field: "note.gone" }, color: { field: "formula.age" } } };

  it("propertiesToConvert: visible + spec refs present in the base + file name/path", () => {
    expect(propertiesToConvert(["note.title"], ["note.title", "note.rating"], spec)).toEqual([
      "note.title", "note.rating", "formula.age", "file.name", "file.path",
    ]);
    // Unknown property list (synthesized view): keep every reference.
    expect(propertiesToConvert([], [], spec)).toContain("note.gone");
  });

  it("resolveViewSpec: file, then inline text, then inline mapping", async () => {
    const load = (p: string) => Promise.resolve({ mark: p });
    expect(await resolveViewSpec("a.vl.json", '{"mark":"x"}', load)).toEqual({ spec: { mark: "a.vl.json" }, specPath: "a.vl.json" });
    expect(await resolveViewSpec(null, "mark: bar", load)).toEqual({ spec: { mark: "bar" }, specPath: null });
    expect(await resolveViewSpec(null, { mark: "line" }, load)).toEqual({ spec: { mark: "line" }, specPath: null });
    expect(await resolveViewSpec(null, "  ", load)).toBeNull();
    await expect(resolveViewSpec(null, "[1]", load)).rejects.toThrow("not an object");
  });
});
