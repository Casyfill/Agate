import { describe, expect, it } from "vitest";
import { edgesDatasetName, linkEdges, pathTree, treeDatasetName } from "../../src/core/data/structure";
import type { Row } from "../../src/core/types";

const row = (path: string, size = 10): Row => ({
  file: { name: path.split("/").pop()!.replace(/\.md$/, ""), path, size },
  note: {},
  formula: {},
});

describe("structure datasets (D12)", () => {
  it("reads usermeta.agate.edges / tree", () => {
    expect(edgesDatasetName({})).toBeNull();
    expect(edgesDatasetName({ usermeta: { agate: { edges: "edges" } } })).toBe("edges");
    expect(treeDatasetName({ usermeta: { agate: { tree: " t " } } })).toBe("t");
    expect(() => treeDatasetName({ usermeta: { agate: { tree: 1 } } })).toThrow(/tree must be/);
  });

  it("keeps links between rows of the base, by row position", () => {
    const rows = [row("Ideas/A.md"), row("Ideas/B.md"), row("Ideas/C.md")];
    const resolved = {
      "Ideas/A.md": { "Ideas/B.md": 2, "Elsewhere/X.md": 1, "Ideas/A.md": 1 },
      "Ideas/C.md": { "Ideas/A.md": 1 },
      "Elsewhere/X.md": { "Ideas/B.md": 1 },
    };
    expect(linkEdges(rows, resolved).map((e) => [e.source, e.target, e.count, e.sourceName, e.targetName])).toEqual([
      [0, 1, 2, "A", "B"],
      [2, 0, 1, "C", "A"],
    ]);
  });

  it("builds a folder tree with ancestors, root first", () => {
    const tree = pathTree([row("Top.md", 5), row("Ideas/A.md", 7), row("Ideas/Deep/B.md", 9)], "My vault");
    const byId = new Map(tree.map((n) => [n.id, n]));
    expect([...byId.keys()]).toEqual(["/", "Ideas", "Ideas/Deep", "Top.md", "Ideas/A.md", "Ideas/Deep/B.md"]);
    expect(byId.get("/")).toMatchObject({ parent: null, name: "My vault", depth: 0, kind: "folder", ancestors: [] });
    expect(byId.get("Ideas")).toMatchObject({ parent: "/", depth: 1, ancestors: ["/"] });
    expect(byId.get("Ideas/Deep")).toMatchObject({ parent: "Ideas", name: "Deep", depth: 2, ancestors: ["/", "Ideas"] });
    expect(byId.get("Ideas/Deep/B.md")).toMatchObject({
      parent: "Ideas/Deep",
      name: "B",
      kind: "file",
      size: 9,
      rowIndex: 2,
      ancestors: ["/", "Ideas", "Ideas/Deep"],
    });
    expect(byId.get("Top.md")).toMatchObject({ parent: "/", depth: 1, ancestors: ["/"] });
    // Folder totals cover everything below them.
    expect(byId.get("/")).toMatchObject({ size: 21, count: 3 });
    expect(byId.get("Ideas")).toMatchObject({ size: 16, count: 2 });
    expect(byId.get("Ideas/Deep")).toMatchObject({ size: 9, count: 1 });
  });
});
