---
tags: [agate-test]
---
# Markets table (per-row data + table cells)

Twelve notes in `tests/Markets/`, one per FRED series (`fred: SP500`). The base builds each note's CSV URL with a formula, Agate fetches one CSV per row, and the spec draws the view as a table with one wide horizon column.

Needs Settings → Agate → **Load remote data** on (this vault has it on). First load fetches twelve CSVs from fred.stlouisfed.org; after that they are cached for 10 minutes. Command palette → **Agate: Refresh remote data** refetches.

![[tests/Markets/Markets.base#Table]]

What to check:

- Columns are Name, Kind, Region, Unit. Toolbar → Properties: hide Unit, show FRED id. The columns follow, the horizon column takes the rest of the width.
- Toolbar → Sort by Name descending: rows reorder.
- Hover the horizon column: a rule follows the mouse across all rows, the date shows in the header, Last and Δ show the values at that date.
- Window select and Band scale radio below the chart.
- Filter `kind is crypto`: two rows left, no refetch (cache).
- Turn **Load remote data** off: error box naming the blocked URL.

Plain horizon strips, no table: ![[tests/Markets/Markets.base#Horizon only]]
