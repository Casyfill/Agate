// Container resizes for charts sized by their container (`width: "container"`); see AgateRenderer.

/** Top-level `width`/`height` signals computed from containerSize(), i.e. sized by the chart's container. */
export function containerSignals(vgSpec: unknown): string[] {
  const signals = (vgSpec as { signals?: Array<{ name?: string }> } | null)?.signals ?? [];
  return signals
    .filter((s) => (s.name === "width" || s.name === "height") && JSON.stringify(s).includes("containerSize"))
    .map((s) => s.name as string);
}

/** Returning to the width before last within a second is a scrollbar bounce, not a resize. */
export function isBounce(width: number, widthBeforeLast: number, msSinceLastResize: number): boolean {
  return width === widthBeforeLast && msSinceLastResize < 1000;
}
