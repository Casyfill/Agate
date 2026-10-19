---
type: dataviz
tags: [dataviz, history, maps]
source: Mapping Inequality, Digital Scholarship Lab, University of Richmond
license: CC-BY-NC
---
# Redlining Brooklyn

Brooklyn's 1938 HOLC "residential security" map. Appraisers graded neighbourhoods A ("Best") through D ("Hazardous"); D-graded areas were the ones banks were steered away from lending in. The term "redlining" comes from these maps.

The 66 graded zones are a GeoJSON file in the vault (`attachments/geo/brooklyn-holc.geojson`, from the Mapping Inequality project), drawn over today's shorelines (`attachments/geo/nyc-boroughs.geojson`) in New York's Long Island state plane projection. No base: Agate reads the files and draws them.

```agate
spec: charts/redlining-brooklyn.vl.json
```

The look nods to the original sheet, where the grades were printed over Hagstrom's street map, and stays plain on purpose: Agate textures lay a fine street grid under each grade's muted colour and a light crosshatch over ungraded land, and the legend quotes the HOLC's own words. Hover a zone for its grade. Companion piece to the [[Du Bois spiral]].
