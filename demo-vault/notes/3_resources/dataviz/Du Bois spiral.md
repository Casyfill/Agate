---
type: dataviz
tags: [dataviz, history]
after: W. E. B. Du Bois
source: Paris Exposition, 1900
original: https://www.loc.gov/item/2013650445/
---
# Du Bois spiral

A recreation of one of the data portraits W. E. B. Du Bois and his students made for the 1900 Paris Exposition: the assessed value of household and kitchen furniture owned by Black Georgians, 1875–1899. As in his plate, it is a bar chart wrapped into a spiral: each year's band starts at the top beside its label and runs clockwise, curling inward as it wraps, its length proportional to the value, from a stub for \$21,186 in 1875 to almost two turns for \$1.4M in 1899. The original, titled "… owned by Georgia Negroes", is at the [Library of Congress](https://www.loc.gov/item/2013650445/).

No base here. The data is hand-set inside the spec, so this is just Agate drawing a Vega chart from a code block — the same renderer, no Bases query behind it.

```agate
spec: charts/dubois-furniture.vg.json
```

The palette and cream paper are Du Bois's; the spiral is computed by Vega from the six figures in the spec. See [[Redlining Brooklyn]] for the same bold-historical register on a real map.
