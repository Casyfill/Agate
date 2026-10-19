// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as vega from "vega";
import { bindTextures, patternElements, texturesOf, texturesSvg } from "../../src/core/textures";

const spec = {
  usermeta: { agate: { textures: { hatch: { stroke: "#c00", background: "#fee", orientation: ["diagonal", "6/8"] }, "bad name": {} } } },
  encoding: { color: { scale: { range: ["url(#hatch)", "url(#other)", "#00f"] } } },
};

describe("textures (SVG fill patterns, textures.js options)", () => {
  it("reads declared textures and drops invalid names", () => {
    expect(Object.keys(texturesOf(spec))).toEqual(["hatch"]);
    expect(texturesOf({})).toEqual({});
  });

  it("gives each chart its own ids for svg, and a flat colour for canvas", () => {
    const tex = texturesOf(spec);
    const svg = bindTextures(spec, tex, "agate-tex-7") as typeof spec;
    expect(svg.encoding.color.scale.range).toEqual(["url(#agate-tex-7-hatch)", "url(#other)", "#00f"]);
    expect(svg.usermeta).toBe(spec.usermeta);
    const canvas = bindTextures(spec, tex, null) as typeof spec;
    expect(canvas.encoding.color.scale.range[0]).toBe("#fee");
  });

  it("draws crossed lines and staggered dots", () => {
    const [lines] = patternElements(document, "p1", { stroke: "#c00", orientation: ["diagonal", "6/8"], size: 8 });
    expect(lines.getAttribute("width")).toBe("8");
    expect(lines.querySelectorAll("path")).toHaveLength(2);
    const [dots] = patternElements(document, "p2", { type: "circles", complement: true, radius: 1.5 });
    expect(dots.querySelectorAll("circle")).toHaveLength(5);
  });

  it("draws named and raw paths, and roughens with a turbulence filter", () => {
    const [waves] = patternElements(document, "p3", { type: "paths", d: "waves", size: 10 });
    expect(waves.querySelector("path")?.getAttribute("d")).toMatch(/^M 0 5 c/);
    const [raw] = patternElements(document, "p4", { type: "paths", d: "M 0,0 L {s},{s}", size: 6 });
    expect(raw.querySelector("path")?.getAttribute("d")).toBe("M 0,0 L 6,6");
    const [hex] = patternElements(document, "p5", { type: "paths", d: "hexagons", size: 4 });
    expect(hex.getAttribute("width")).toBe("12");
    const [rough, filter] = patternElements(document, "p6", { stroke: "#000", rough: 1.5 });
    expect(filter.getAttribute("id")).toBe("p6-rough");
    expect(rough.querySelector("g")?.getAttribute("filter")).toBe("url(#p6-rough)");
    expect(filter.querySelector("feDisplacementMap")?.getAttribute("scale")).toBe("1.5");
    // A horizontal line has a zero-height bounding box; the filter region must not depend on it.
    expect(filter.getAttribute("filterUnits")).toBe("userSpaceOnUse");
  });

  it("fills Vega marks once the patterns sit next to the chart", async () => {
    const host = document.createElement("div");
    const tex = { hatch: { stroke: "#c00" } };
    host.appendChild(texturesSvg(document, tex, "t1"));
    const chart = host.appendChild(document.createElement("div"));
    const vg = bindTextures(
      { width: 20, height: 20, marks: [{ type: "rect", encode: { enter: { width: { value: 20 }, height: { value: 20 }, fill: { value: "url(#hatch)" } } } }] },
      tex,
      "t1",
    );
    const view = new vega.View(vega.parse(vg), { renderer: "svg" }).initialize(chart);
    await view.runAsync();
    expect(host.querySelector("pattern#t1-hatch")).not.toBeNull();
    expect(chart.querySelector("path[fill='url(#t1-hatch)'], rect[fill='url(#t1-hatch)']")).not.toBeNull();
    view.finalize();
  });
});
