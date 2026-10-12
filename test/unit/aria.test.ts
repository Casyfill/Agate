// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as vega from "vega";
import { moveAriaLabels, quietAriaLabels } from "../../src/core/aria";

describe("aria labels (no Obsidian tooltip from spec descriptions)", () => {
  it("moves the label Vega puts on the container to aria-description", async () => {
    const el = document.createElement("div");
    const spec = { $schema: "https://vega.github.io/schema/vega/v6.json", description: "A long description", width: 10, height: 10 };
    const view = new vega.View(vega.parse(spec), { renderer: "none" }).initialize(el);
    await view.runAsync();
    expect(el.getAttribute("aria-label")).toBe("A long description");
    moveAriaLabels(el);
    expect(el.getAttribute("aria-label")).toBeNull();
    expect(el.getAttribute("aria-description")).toBe("A long description");
    view.finalize();
  });

  it("keeps moving labels added after the first pass", async () => {
    const el = document.createElement("div");
    const observer = quietAriaLabels(el);
    const child = document.createElement("span");
    el.appendChild(child);
    child.setAttribute("aria-label", "late");
    await new Promise((r) => window.setTimeout(r, 0));
    expect(child.getAttribute("aria-label")).toBeNull();
    expect(child.getAttribute("aria-description")).toBe("late");
    observer?.disconnect();
  });
});
