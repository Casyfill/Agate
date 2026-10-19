import { describe, expect, it } from "vitest";
import { buildThemePrompt } from "../../src/core/prompt";

const base = {
  colors: { text: "#111", background: "#fff", accent: "#7c3aed", blue: "#086ddd" },
  fonts: { interface: "Inter", text: "Georgia", mono: "Menlo", textSize: 16 },
  env: {
    agate: "1.0.0",
    obsidian: "1.13.0",
    vega: "6.2.0",
    vegaLite: "6.5.0",
    vegaEmbed: "7.0.0",
    renderer: "svg" as const,
    allowRemote: false,
  },
};

describe("buildThemePrompt", () => {
  it("includes the palette, fonts and target Vega major version", () => {
    const out = buildThemePrompt(base);
    expect(out).toContain("accent: #7c3aed");
    expect(out).toContain("blue: #086ddd");
    expect(out).toContain('interface "Inter"');
    expect(out).toContain('reading "Georgia"');
    expect(out).toContain("16px");
    expect(out).toContain("Vega v6");
    expect(out).toContain("Reply with the JSON config object only.");
  });

  it("names the configured theme file as the destination", () => {
    const out = buildThemePrompt({ ...base, themeFilePath: "themes/mine.json" });
    expect(out).toContain("themes/mine.json");
  });

  it("defaults the destination when no theme file is set", () => {
    expect(buildThemePrompt(base)).toContain("agate/theme.json");
  });

  it("includes current overrides only when present", () => {
    expect(buildThemePrompt(base)).not.toContain("My current overrides");
    const withOverrides = buildThemePrompt({ ...base, currentOverrides: '{"mark":{"color":"#e93147"}}' });
    expect(withOverrides).toContain("My current overrides");
    expect(withOverrides).toContain('{"mark":{"color":"#e93147"}}');
  });
});
