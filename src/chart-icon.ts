// Icon for the "Agate chart" view in the Bases view picker: a rounded square with a spline
// from the lower-left to the upper-right corner. Drawn on Lucide's 24-unit grid, like the core
// Table/Cards/List icons, and scaled into the 100x100 box addIcon() uses. Only the group is
// scaled, so the stroke width Obsidian applies to .svg-icon (var(--icon-stroke)) comes out at
// the same thickness as its own icons and follows themes that change it.
export const CHART_VIEW_ICON_ID = "agate-chart-view";
export const CHART_VIEW_ICON_SVG =
  '<g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect width="18" height="18" x="3" y="3" rx="2"/>' +
  '<path d="M4.5 19.5c2 0 2.5-5.5 4.5-5.5s2.5 3 4.5 3 3-12.5 6-12.5"/>' +
  "</g>";
