// @vitest-environment jsdom
import { expect, it } from "vitest";
import { renderStats } from "../../src/core/stats";

it("renderStats draws cells and marks the Bases host", () => {
  const host = document.createElement("div");
  host.className = "agate-bases-view";
  const el = host.appendChild(document.createElement("div"));
  renderStats(el, [{ value: "26", label: "books", change: "3", direction: "up", good: true }]);
  expect(host.classList.contains("agate-has-stats")).toBe(true);
  expect(el.querySelector(".agate-stat-value")?.textContent).toBe("26");
  expect(el.querySelector(".agate-stat-change")?.className).toBe("agate-stat-change is-up is-good");
  renderStats(el, null);
  expect(host.classList.contains("agate-has-stats")).toBe(false);
});
