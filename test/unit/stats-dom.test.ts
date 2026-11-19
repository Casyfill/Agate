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

it("renderStats puts small rows on a line of their own after the big ones", () => {
  const el = document.createElement("div");
  renderStats(el, [
    { value: "3", label: "abandoned", small: true },
    { value: "26", label: "books" },
  ]);
  expect(Array.from(el.children).map((c) => c.className)).toEqual(["agate-stat", "agate-stats-minor"]);
  expect(el.querySelector(".agate-stats-minor .agate-stat-value")?.textContent).toBe("3");
});

it("renderStats colours a toned value and adds a row's classes", () => {
  const el = document.createElement("div");
  renderStats(el, [{ value: "2.1", label: "grade", tone: "--color-red", classes: ["focus"] }]);
  const cell = el.querySelector(".agate-stat") as HTMLElement;
  expect(cell.className).toBe("agate-stat focus has-tone");
  expect(cell.style.getPropertyValue("--agate-stat-tone")).toBe("var(--color-red)");
});
