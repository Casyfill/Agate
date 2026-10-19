---
tags: [agate-test]
---
# Note for a Canvas file card

Embedding this note as a file card in `Canvas.canvas` tests Surface B inside Canvas.

```agate
spec: tests/charts/pages-vs-rating.vl.json
base: tests/Library/Books.base
```

Hover a point inside the card (select the card first): highlight and tooltip should work. Drag-based brushes lose to card drag in Canvas, which is why the examples use hover.
