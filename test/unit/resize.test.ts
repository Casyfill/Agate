import { describe, expect, it } from "vitest";
import * as vl from "vega-lite";
import { containerSignals, isBounce } from "../../src/core/resize";

describe("container resize", () => {
  it("finds the signals a container-width spec sizes from its container", () => {
    const vg = vl.compile({ width: "container", data: { values: [] }, mark: "point" } as never).spec;
    expect(containerSignals(vg)).toEqual(["width"]);
    expect(containerSignals(vl.compile({ width: 300, data: { values: [] }, mark: "point" } as never).spec)).toEqual([]);
  });

  it("treats a quick return to the width before last as a scrollbar bounce", () => {
    expect(isBounce(700, 700, 200)).toBe(true);
    expect(isBounce(700, 700, 5000)).toBe(false); // the user dragged the pane back
    expect(isBounce(650, 700, 200)).toBe(false);
  });
});
