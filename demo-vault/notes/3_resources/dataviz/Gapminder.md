---
type: dataviz
tags: [dataviz, gapminder]
source: Gapminder (gapminder.org), via the gapminder R package
license: CC-BY 4.0
---
# Wealth and health of nations

Hans Rosling's chart: income per person against life expectancy, a bubble per country sized by population, 1952 to 2007. Drag the year to watch the world move up and to the right; the faint trails show where each country came from.

Every country is a note in `3_resources/gapminder`, with its continent as a property and its own CSV of figures (`data:`). Agate loads one file per note, so the base decides which countries are drawn: filter it to one continent and the chart follows.

![[Gapminder.base#Wealth and health]]
