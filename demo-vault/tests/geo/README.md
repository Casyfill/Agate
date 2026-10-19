Source files the demo-vault generator copies into `attachments/geo/` (that folder is rebuilt on every run).

- `world-110m.json`: Natural Earth via world-atlas; see `world-110m.LICENSE.txt`.
- `brooklyn-holc.geojson`: Brooklyn's 1938 HOLC grades, from Mapping Inequality (Digital Scholarship Lab, University of Richmond), CC BY-NC. Rings rewound for d3-geo; only `grade`, `label`, `name`, `lon`, `lat` kept.
- `nyc-boroughs.geojson`: borough shorelines (NYC Department of City Planning, via github.com/dwillis/nyc-maps), simplified, Bronx dropped, rings rewound for d3-geo.
