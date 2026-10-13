---
tags: [agate-test]
---
# Surface A: the `agate` Bases view, embedded

Nothing Agate-specific in this note. `tests/Library/Books.base` has several views of type `agate`; embedding the base with `#ViewName` picks one.

## Ratings by genre

![[tests/Library/Books.base#Ratings]]

## Scatter with hover highlight

![[tests/Library/Books.base#Scatter]]

## Grouped (uses the `group` field)

![[tests/Library/Books.base#Grouped]]

Expected: three charts. In each embed, the Bases toolbar is available (hover the embed, or open `Books.base` directly): change a filter, sort, or toggle properties and the chart updates in place. Hover a point in the scatter for the highlight and tooltip. (Drag-based brushes also work in notes and base tabs, just not in Canvas cards; the examples leave them out.)

Also open `tests/Library/Books.base` in its own tab and switch between the views with the view menu. The "Inline spec" view has its spec typed straight into the `.base` file.
