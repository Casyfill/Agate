// @vitest-environment jsdom
import { expect, it } from "vitest";
import { cycleHeaders } from "../../src/core/headers";

it("cycleHeaders steps auto → hide → show → auto, with one class at a time", () => {
  const el = document.createElement("div");
  const seen = [1, 2, 3].map(() => [cycleHeaders(el), el.className]);
  expect(seen).toEqual([
    ["hide", "agate-headers-hide"],
    ["show", "agate-headers-show"],
    ["auto", ""],
  ]);
});
