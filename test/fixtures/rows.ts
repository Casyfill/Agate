import type { Row } from "../../src/core/types";

/** Rows in the ADR-0001 D4 shape, mirroring a few notes from demo-vault/tests/Library. */
export const defaultRows: Row[] = [
  {
    file: { name: "Dune", path: "Library/Dune.md", ext: "md", folder: "Library", size: 412 },
    note: { author: "Frank Herbert", genre: "sci-fi", rating: 5, pages: 412, published: "1965-08-01", status: "read" },
    formula: { age: 61, decade: 1960 },
    group: "sci-fi",
  },
  {
    file: { name: "The Hobbit", path: "Library/The Hobbit.md", ext: "md", folder: "Library", size: 318 },
    note: { author: "J.R.R. Tolkien", genre: "fantasy", rating: 5, pages: 310, published: "1937-09-21", status: "read" },
    formula: { age: 89, decade: 1930 },
    group: "fantasy",
  },
  {
    file: { name: "Gone Girl", path: "Library/Gone Girl.md", ext: "md", folder: "Library", size: 377 },
    note: { author: "Gillian Flynn", genre: "thriller", rating: 3, pages: 415, published: "2012-06-05", status: "read" },
    formula: { age: 14, decade: 2010 },
    group: "thriller",
  },
  {
    file: { name: "Sapiens", path: "Library/Sapiens.md", ext: "md", folder: "Library", size: 405 },
    note: { author: "Yuval Noah Harari", genre: "non-fiction", rating: 4, pages: 443, published: "2011-01-01", status: "read" },
    formula: { age: 15, decade: 2010 },
    group: "non-fiction",
  },
  {
    file: { name: "Unrated Draft", path: "Library/Unrated Draft.md", ext: "md", folder: "Library", size: 96 },
    note: { author: "Unknown", genre: "sci-fi", rating: null, pages: 120, published: null, status: "to-read" },
    formula: { age: null, decade: null },
    group: "sci-fi",
  },
];
