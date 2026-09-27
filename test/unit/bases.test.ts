import { describe, expect, it } from "vitest";
import {
  BasesEntry,
  BasesEntryGroup,
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
  TFile,
  UnknownValue,
} from "obsidian";
import { entryToRow, groupsToRows, valueToJson } from "../../src/core/data/bases";
import { opaque } from "../helpers";

describe("valueToJson (D4 table)", () => {
  it("maps null and NullValue to null", () => {
    expect(valueToJson(null)).toBeNull();
    expect(valueToJson(undefined)).toBeNull();
    expect(valueToJson(NullValue.value)).toBeNull();
  });

  it("maps primitives through the raw value when visible", () => {
    expect(valueToJson(new NumberValue(4))).toBe(4);
    expect(valueToJson(new StringValue("fantasy"))).toBe("fantasy");
    expect(valueToJson(new BooleanValue(false))).toBe(false);
  });

  it("maps primitives through toString() when the raw value is hidden", () => {
    expect(valueToJson(opaque(new NumberValue(4.5)))).toBe(4.5);
    expect(valueToJson(opaque(new StringValue("x")))).toBe("x");
    expect(valueToJson(opaque(new BooleanValue(true)))).toBe(true);
    expect(valueToJson(opaque(new NumberValue(NaN)))).toBeNull();
  });

  it("maps dates to ISO, with and without time, raw or via toString()", () => {
    const d = new Date("1965-08-01T00:00:00.000Z");
    expect(valueToJson(new DateValue(d))).toBe("1965-08-01T00:00:00.000Z");
    expect(valueToJson(opaque(new DateValue(d)))).toBe("1965-08-01");
    expect(valueToJson(opaque(new DateValue(new Date("2025-12-31T23:59:00Z"), true)))).toBe("2025-12-31T23:59:00");
  });

  it("maps durations to milliseconds", () => {
    expect(valueToJson(new DurationValue(86_400_000))).toBe(86_400_000);
  });

  it("maps lists recursively", () => {
    const list = new ListValue([new StringValue("a"), new NumberValue(2), NullValue.value]);
    expect(valueToJson(list)).toEqual(["a", 2, null]);
  });

  it("maps links and files to paths", () => {
    expect(valueToJson(new LinkValue("Library/Dune.md", "Dune"))).toBe("Library/Dune.md");
    expect(valueToJson(opaque(new LinkValue("Library/Dune.md", "Dune")))).toBe("Library/Dune.md");
    expect(valueToJson(new FileValue("a/b.md"))).toBe("a/b.md");
  });

  it("maps objects to plain JSON", () => {
    expect(valueToJson(new ObjectValue({ a: 1, b: "x" }))).toEqual({ a: 1, b: "x" });
    expect(valueToJson(opaque(new ObjectValue({ a: 1 })))).toEqual({ a: 1 });
  });

  it("falls back to toString() for unknown Value classes (ErrorValue etc.)", () => {
    expect(valueToJson(new UnknownValue("Error: no such function"))).toBe("Error: no such function");
  });
});

function entry(path: string, values: ConstructorParameters<typeof BasesEntry>[1]): BasesEntry {
  return new BasesEntry(new TFile(path, "x".repeat(42)), values);
}

describe("entryToRow", () => {
  it("nests by property namespace and fills file.* from TFile", () => {
    const row = entryToRow(
      entry("Library/Dune.md", {
        "note.rating": new NumberValue(5),
        "note.genre": new StringValue("sci-fi"),
        "formula.age": new NumberValue(61),
        "file.tags": new ListValue([new StringValue("book")]),
        "file.name": new StringValue("Dune"),
      }),
      ["note.rating", "note.genre", "formula.age", "file.tags", "file.name", "file.path"],
    );
    expect(row.note).toEqual({ rating: 5, genre: "sci-fi" });
    expect(row.formula).toEqual({ age: 61 });
    expect(row.file).toMatchObject({
      name: "Dune",
      path: "Library/Dune.md",
      ext: "md",
      folder: "Library",
      size: 42,
      tags: ["book"],
    });
    expect(typeof (row.file as { ctime: unknown }).ctime).toBe("string");
  });

  it("keeps TFile-derived file fields even when Bases has its own", () => {
    const row = entryToRow(
      entry("Library/Dune.md", { "file.name": new StringValue("Dune.md"), "file.size": new NumberValue(999) }),
      ["file.name", "file.size"],
    );
    expect((row.file as { name: string }).name).toBe("Dune");
    expect((row.file as { size: number }).size).toBe(42);
  });

  it("writes null for missing properties and survives getValue throwing", () => {
    const e = entry("a.md", { "note.rating": null });
    e.getValue = ((id: string) => {
      if (id === "note.boom") throw new Error("boom");
      return null;
    });
    const row = entryToRow(e, ["note.rating", "note.boom"]);
    expect(row.note).toEqual({ rating: null, boom: null });
  });
});

describe("groupsToRows", () => {
  it("adds group only when the group has a key", () => {
    const a = entry("a.md", { "note.genre": new StringValue("x") });
    const b = entry("b.md", { "note.genre": new StringValue("y") });
    const grouped = groupsToRows(
      [new BasesEntryGroup([a], new StringValue("x")), new BasesEntryGroup([b], new StringValue("y"))],
      ["note.genre"],
    );
    expect(grouped.map((r) => r.group)).toEqual(["x", "y"]);

    const ungrouped = groupsToRows([new BasesEntryGroup([a, b])], ["note.genre"]);
    expect(ungrouped.every((r) => !("group" in r))).toBe(true);
    expect(ungrouped).toHaveLength(2);
  });
});
