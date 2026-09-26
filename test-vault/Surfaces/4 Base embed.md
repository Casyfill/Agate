---
tags: [agate-test]
---
# Surface A: the `agate` Bases view, embedded

Nothing Agate-specific in this note. `Library/Books.base` has several views of type `agate`; embedding the base with `#ViewName` picks one.

## Ratings by genre

![[Library/Books.base#Ratings]]

## Scatter with brush

![[Library/Books.base#Scatter]]

## Grouped (uses the `group` field)

![[Library/Books.base#Grouped]]

Expected: three charts. In each embed, the Bases toolbar is available (hover the embed, or open `Books.base` directly): change a filter, sort, or toggle properties and the chart updates in place. Brush in the scatter, then change a filter: the brush should survive.

Also open `Library/Books.base` in its own tab and switch between the views with the view menu. The "Inline spec" view has its spec typed straight into the `.base` file.
