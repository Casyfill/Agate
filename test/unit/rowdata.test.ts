import { describe, expect, it } from "vitest";
import {
  RowDataCache,
  expandRowData,
  getProperty,
  inferFormat,
  rowDataDefs,
  toUri,
} from "../../src/core/data/rowdata";
import type { Row } from "../../src/core/types";

const rows: Row[] = [
  { file: { name: "A", path: "M/A.md" }, note: { src: "data/a.csv" }, formula: { url: "https://x.test/a.csv" } },
  { file: { name: "B", path: "M/B.md" }, note: { src: "[[b.json|B data]]" }, formula: {}, group: "g1" },
  { file: { name: "C", path: "M/C.md" }, note: { src: [3, 4, 5] }, formula: {} },
  { file: { name: "D", path: "M/D.md" }, note: { src: null }, formula: {} },
];

const files: Record<string, string> = {
  "data/a.csv": "date,v\n2026-01-01,1\n2026-01-02,2\n",
  "b.json": '[{"date":"2026-01-01","v":10,"note":"clobbered"}]',
  "https://x.test/a.csv": "date,v\n2026-01-01,7\n",
};

function loader(calls: string[] = []) {
  return async (uri: string): Promise<string> => {
    calls.push(uri);
    if (!(uri in files)) throw new Error(`not found: ${uri}`);
    return files[uri];
  };
}

describe("rowDataDefs (D12)", () => {
  it("reads one definition or a list from usermeta.agate.rowData", () => {
    expect(rowDataDefs({})).toEqual([]);
    expect(rowDataDefs({ usermeta: { agate: { rowData: { name: "s", from: "note.src" } } } })).toEqual([
      { name: "s", from: "note.src", format: undefined },
    ]);
    const two = rowDataDefs({
      usermeta: { agate: { rowData: [{ name: "a", from: "note.x" }, { name: "b", from: "formula.y", format: { type: "tsv" } }] } },
    });
    expect(two.map((d) => d.name)).toEqual(["a", "b"]);
    expect(two[1].format).toEqual({ type: "tsv" });
  });

  it("rejects malformed definitions with the path in the message", () => {
    expect(() => rowDataDefs({ usermeta: { agate: { rowData: { from: "note.x" } } } })).toThrow(/rowData\.name/);
    expect(() => rowDataDefs({ usermeta: { agate: { rowData: [{ name: "a", from: "rating" }] } } })).toThrow(
      /rowData\[0\]\.from/,
    );
  });
});

describe("helpers", () => {
  it("getProperty splits on the first dot only", () => {
    expect(getProperty({ note: { "a.b": 1 } }, "note.a.b")).toBe(1);
    expect(getProperty({}, "note.x")).toBeUndefined();
  });

  it("toUri strips wikilink brackets, aliases and headings", () => {
    expect(toUri("[[data/x.csv|X]]")).toBe("data/x.csv");
    expect(toUri("![[x.csv#part]]")).toBe("x.csv");
    expect(toUri(" https://a.test/b.csv?id=1 ")).toBe("https://a.test/b.csv?id=1");
  });

  it("inferFormat uses the extension before the query, then sniffs", () => {
    expect(inferFormat("https://fred.test/graph/fredgraph.csv?id=SP500", "")).toEqual({ type: "csv", parse: "auto" });
    expect(inferFormat("x.tsv", "")).toEqual({ type: "tsv", parse: "auto" });
    expect(inferFormat("x.json", "")).toEqual({ type: "json" });
    expect(inferFormat("api://thing", ' [{"a":1}]')).toEqual({ type: "json" });
    expect(inferFormat("api://thing", "a,b\n1,2")).toEqual({ type: "csv", parse: "auto" });
  });
});

describe("expandRowData (D12)", () => {
  it("loads each row's file, parses it, and attaches the parent row", async () => {
    const { records, errors } = await expandRowData(rows, { name: "s", from: "note.src" }, { load: loader() });
    expect(errors).toEqual([]);
    expect(records.map((r) => [(r.file as { name: string }).name, r.v ?? r.value, r.rowIndex])).toEqual([
      ["A", 1, 0],
      ["A", 2, 0],
      ["B", 10, 1],
      ["C", 3, 2],
      ["C", 4, 2],
      ["C", 5, 2],
    ]);
    // CSV columns are typed by parse: auto (dates become epoch ms); JSON keys named like parent keys lose to the parent.
    expect(records[0].date).toBe(Date.UTC(2026, 0, 1));
    expect(records[2].note).toEqual({ src: "[[b.json|B data]]" });
    expect(records[2].group).toBe("g1");
    expect(records[3]).toMatchObject({ index: 0, value: 3 });
  });

  it("reports rows that fail and keeps the others", async () => {
    const broken: Row[] = [...rows.slice(0, 1), { file: { path: "M/E.md" }, note: { src: "missing.csv" } }];
    const { records, errors } = await expandRowData(broken, { name: "s", from: "note.src" }, { load: loader() });
    expect(records).toHaveLength(2);
    expect(errors).toEqual(["M/E.md: not found: missing.csv"]);
  });

  it("caches remote loads within the TTL, never vault reads", async () => {
    let t = 0;
    const cache = new RowDataCache(1000, () => t);
    const calls: string[] = [];
    const deps = { load: loader(calls), cache };
    await expandRowData(rows, { name: "s", from: "formula.url" }, deps);
    await expandRowData(rows, { name: "s", from: "formula.url" }, deps);
    await expandRowData(rows.slice(0, 1), { name: "s", from: "note.src" }, deps);
    await expandRowData(rows.slice(0, 1), { name: "s", from: "note.src" }, deps);
    expect(calls).toEqual(["https://x.test/a.csv", "data/a.csv", "data/a.csv"]);
    t = 1001;
    await expandRowData(rows, { name: "s", from: "formula.url" }, deps);
    expect(calls.filter((c) => c.startsWith("https"))).toHaveLength(2);
  });

  it("does not cache a failed remote load", async () => {
    const cache = new RowDataCache();
    let fail = true;
    const load = async (): Promise<string> => {
      if (fail) throw new Error("offline");
      return "a\n1\n";
    };
    const row: Row[] = [{ file: { path: "x" }, note: { u: "https://y.test/z.csv" } }];
    expect((await expandRowData(row, { name: "s", from: "note.u" }, { load, cache })).errors).toHaveLength(1);
    fail = false;
    expect((await expandRowData(row, { name: "s", from: "note.u" }, { load, cache })).records).toHaveLength(1);
  });
});

describe("table cells (D12)", async () => {
  const { cellText, cellsDatasetName, normalizePropertyId, tableCells } = await import("../../src/core/data/table");

  it("reads usermeta.agate.cells", () => {
    expect(cellsDatasetName({})).toBeNull();
    expect(cellsDatasetName({ usermeta: { agate: { cells: " cells " } } })).toBe("cells");
    expect(() => cellsDatasetName({ usermeta: { agate: { cells: 3 } } })).toThrow(/cells must be/);
  });

  it("formats values the way a table cell shows them", () => {
    expect([null, 3, 2.123456, "x", true, ["a", null, 2]].map(cellText)).toEqual(["", "3", "2.1235", "x", "true", "a, 2"]);
    expect(normalizePropertyId("fred")).toBe("note.fred");
    expect(normalizePropertyId("formula.csv")).toBe("formula.csv");
  });

  it("emits one cell per row and visible property, in order", () => {
    const cells = tableCells(rows.slice(0, 2), ["file.name", "src"], (id) => id.toUpperCase());
    expect(cells.map((c) => [c.rowIndex, c.column, c.label, c.text])).toEqual([
      [0, 0, "FILE.NAME", "A"],
      [0, 1, "NOTE.SRC", "data/a.csv"],
      [1, 0, "FILE.NAME", "B"],
      [1, 1, "NOTE.SRC", "[[b.json|B data]]"],
    ]);
  });
});
