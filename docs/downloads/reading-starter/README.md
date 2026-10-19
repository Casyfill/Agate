# Agate reading starter

The files for the Agate quickstart (https://casyfill.github.io/Agate/quickstart.html). Unzip into the root of a vault:

- `Reading/`: 26 book notes with `author`, `genre`, `pages`, `status`, `started`, `finished`, `rating`. Made up, from Agate's demo vault.
- `Books.base`: a base over them, with a table view and a chart view.
- `charts/bars-genre.vl.json`: the spec the Genres view uses, as the "Notes per category" recipe writes it.
- `charts/bookshelf.vl.json`: the finished chart after the tutorial's edits, used by the Bookshelf view. Covers come from Open Library by ISBN.
- `charts/bookshelf-covers.vl.json`: the optional last edit: covers at each block's spine, books in progress with a rounded open end. Needs Settings → Agate → Load remote data for the covers.
- `charts/reading-stats.vl.json`: headline numbers (books finished, pages read, days per book, pages abandoned) as note text, for the Numbers view.
