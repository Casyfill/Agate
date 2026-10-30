import { describe, expect, it } from "vitest";
import type { Loader } from "vega";
import { trackFailures } from "../../src/core/loader";
import { orderChanged } from "../../src/core/spec";

const rows = (...paths: string[]) => paths.map((path) => ({ file: { path } }));

describe("renderer data updates", () => {
  it("re-embeds on a sort change, not on a filter change", () => {
    expect(orderChanged(rows("a", "b", "c"), rows("a", "c"))).toBe(false);
    expect(orderChanged(rows("a", "c"), rows("a", "b", "c"))).toBe(false);
    expect(orderChanged(rows("a", "b", "c"), rows("c", "b", "a"))).toBe(true);
    expect(orderChanged(rows("a", "b", "c"), rows("b", "a"))).toBe(true);
    expect(orderChanged([{ x: 1 }, { x: 2 }], [{ x: 2 }, { x: 1 }])).toBe(false);
  });

  it("notes failed loads and still fails them for Vega", async () => {
    const failures: string[] = [];
    const base = {
      load: async (uri: string) => {
        if (uri === "missing.json") throw new Error(`Data file not found in vault: ${uri}`);
        return "[]";
      },
    } as unknown as Loader;
    const loader = trackFailures(base, failures);
    await expect(loader.load("ok.json")).resolves.toBe("[]");
    await expect(loader.load("missing.json")).rejects.toThrow("missing.json");
    expect(failures).toEqual(["Data file not found in vault: missing.json"]);
  });
});
