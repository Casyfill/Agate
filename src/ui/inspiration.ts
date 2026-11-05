/**
 * Links on the empty chart view. Inspiration comes first: personal-data work close to what people
 * keep in a vault. Spec examples follow in a quieter line. Plain links: nothing is fetched.
 */
export interface InspirationLink {
  name: string;
  url: string;
  note?: string;
}

export const INSPIRATION: InspirationLink[] = [
  { name: "Dear Data", url: "http://www.dear-data.com/all", note: "A year of hand-drawn postcards about daily life" },
  { name: "Feltron Annual Reports", url: "http://feltron.com/", note: "Ten years of one person's life in numbers" },
  { name: "Data Sketches", url: "https://www.datasketch.es/", note: "Personal projects, each with how it was made" },
  {
    name: "Information is Beautiful Awards",
    url: "https://www.informationisbeautifulawards.com/showcase",
    note: "Award entries, filterable by topic",
  },
];

export const EXAMPLES: InspirationLink[] = [
  { name: "Agate gallery", url: "https://casyfill.github.io/Agate/gallery.html" },
  { name: "Vega-Lite", url: "https://vega.github.io/vega-lite/examples/" },
  { name: "Vega", url: "https://vega.github.io/vega/examples/" },
];

/** The inspiration block and the examples line, appended to `el`. */
export function renderInspiration(el: HTMLElement): void {
  const box = el.createDiv({ cls: "agate-inspiration" });
  box.createDiv({ cls: "agate-inspiration-title", text: "Inspiration" });
  const grid = box.createDiv({ cls: "agate-inspiration-links" });
  for (const link of INSPIRATION) {
    const item = grid.createEl("a", { cls: "agate-inspiration-link external-link", href: link.url });
    item.createSpan({ cls: "agate-inspiration-name", text: link.name });
    if (link.note) item.createSpan({ cls: "agate-inspiration-note", text: link.note });
  }
  const line = box.createDiv({ cls: "agate-inspiration-examples" });
  line.createSpan({ text: "Spec examples: " });
  EXAMPLES.forEach((link, i) => {
    if (i > 0) line.createSpan({ text: " · " });
    line.createEl("a", { cls: "external-link", href: link.url, text: link.name });
  });
}
