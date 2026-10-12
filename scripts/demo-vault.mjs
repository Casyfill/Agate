// Run: node scripts/demo-vault.mjs
// Writes the notes, data files and bases of demo-vault/ from a fixed seed, so screenshots and
// tests are stable. Hand-written parts (demo-vault/charts, Start here, Dashboard) are left alone.
// Everything here is invented; the hike follows the Appalachian Trail in Georgia only roughly
// and must not be used for navigation.
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";

const ROOT = new URL("../demo-vault/", import.meta.url).pathname;
const GENERATED = ["notes", "attachments", "bases", ".obsidian/types.json"];

// --- deterministic randomness --------------------------------------------------------------
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261007);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => rnd() - 0.5).slice(0, n);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const between = (a, b) => a + (b - a) * rnd();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

// --- writing helpers -------------------------------------------------------------------------
function yamlValue(v) {
  if (Array.isArray(v)) return `[${v.map(yamlValue).join(", ")}]`;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // a plain YAML date, typed as a date by Obsidian
    return /^[\w .\-/]+$/.test(v) && !/^\d/.test(v) && !["true", "false", "null"].includes(v) ? v : JSON.stringify(v);
  }
  return String(v);
}
const NOTES = []; // every generated note, for the facts in the area notes
function note(path, props, body = "") {
  NOTES.push({ path, name: path.split("/").pop().replace(/\.md$/, ""), props });
  const fm = Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${yamlValue(v)}`)
    .join("\n");
  write(path, `---\n${fm}\n---\n${body}\n`);
}
function write(path, text) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}
const link = (name) => `[[${name}]]`;
const lorem = (n) => {
  const words = "note idea review plan follow up question draft decision context next step summary detail reference source thought sketch".split(" ");
  return Array.from({ length: n }, () => pick(words)).join(" ") + ".";
};

for (const dir of GENERATED) rmSync(join(ROOT, dir), { recursive: true, force: true });

// --- people -------------------------------------------------------------------------------------
const people = [
  ["Ana Ruiz", "design", "Product"], ["Ben Okafor", "engineering", "Platform"], ["Chen Wei", "data", "Analytics"],
  ["Dana Kim", "product", "Product"], ["Eli Novak", "engineering", "Platform"], ["Farah Haddad", "research", "Product"],
  ["Gus Lindqvist", "engineering", "Mobile"], ["Hana Sato", "data", "Analytics"], ["Iris Moreau", "marketing", "Growth"],
  ["Jon Bell", "management", "Leadership"], ["Kai Peters", "engineering", "Mobile"], ["Lena Ivanova", "data", "Analytics"],
  ["Maya Patel", "partner", "External"], ["Noor Aziz", "partner", "External"],
];
for (const [name, role, team] of people) {
  note(`notes/2_areas/people/${name}.md`, { type: "person", tags: ["person"], role, team }, `# ${name}\n\n${lorem(12)}`);
}
const names = people.map((p) => p[0]);

// --- projects (by area folder) --------------------------------------------------------------
const projects = [
  ["work", "Search relaunch", "active", 1, "2026-02-02", "2026-11-30", ["Ana Ruiz", "Ben Okafor", "Dana Kim"]],
  ["work", "Pricing model v2", "active", 1, "2026-04-06", "2026-10-31", ["Chen Wei", "Hana Sato", "Jon Bell"]],
  ["work", "Data catalog", "done", 2, "2025-11-03", "2026-05-29", ["Lena Ivanova", "Chen Wei"]],
  ["work", "Mobile onboarding", "paused", 2, "2026-03-02", "2026-12-18", ["Gus Lindqvist", "Kai Peters", "Ana Ruiz"]],
  ["work", "Partner API", "active", 2, "2026-06-01", "2027-01-29", ["Maya Patel", "Noor Aziz", "Eli Novak"]],
  ["work", "Experiment platform", "idea", 3, "2026-10-05", "2027-03-31", ["Hana Sato", "Farah Haddad"]],
  ["home", "Kitchen renovation", "active", 1, "2026-05-04", "2026-11-13", []],
  ["home", "Garden beds", "done", 3, "2026-03-16", "2026-05-08", []],
  ["health", "Half marathon", "active", 2, "2026-06-15", "2026-10-25", []],
  ["learning", "Rust 101 course", "paused", 3, "2026-01-12", "2026-09-30", []],
  ["learning", "Vega deep dive", "done", 2, "2026-07-01", "2026-09-26", []],
  ["learning", "Japanese N4", "active", 3, "2026-01-05", "2026-12-06", []],
];
for (const [area, name, status, priority, start, due, ppl] of projects) {
  note(
    `notes/1_projects/${area}/${name}.md`,
    { type: "project", tags: ["project"], area, status, priority, start, due, people: ppl.map(link) },
    `# ${name}\n\n${ppl.map((p) => `Working with ${link(p)}.`).join(" ")} ${lorem(30)}`,
  );
}
const workProjects = projects.filter((p) => p[0] === "work");

// --- meetings ----------------------------------------------------------------------------------
const kinds = [["1:1", 30], ["standup", 15], ["review", 45], ["planning", 60], ["external", 45]];
let day = new Date("2026-04-06T00:00:00Z");
let meetings = 0;
while (day < new Date("2026-10-03T00:00:00Z")) {
  const wd = day.getUTCDay();
  if (wd >= 1 && wd <= 5) {
    const perDay = Math.floor(between(0, 3.2));
    for (let i = 0; i < perDay; i++) {
      const proj = pick(workProjects);
      const [kind, duration] = pick(kinds);
      const team = proj[6].length ? proj[6] : names;
      // Mostly the project's own team; now and then someone from outside joins.
      const guests = rnd() < 0.2 ? [pick(names)] : [];
      const attendees = kind === "1:1" ? [pick(team)] : sample(team, Math.min(team.length, 2 + Math.floor(rnd() * 2))).concat(guests);
      const uniq = [...new Set(attendees)];
      const title = kind === "1:1" ? `1-1 ${uniq[0]}` : `${proj[1]} ${kind}`;
      note(
        `notes/2_areas/work/meetings/${iso(day)} ${title}.md`,
        { type: "meeting", tags: ["meeting"], date: iso(day), kind, duration, project: link(proj[1]), attendees: uniq.map(link) },
        `With ${uniq.map(link).join(", ")} about ${link(proj[1])}. ${lorem(15 + Math.floor(rnd() * 40))}`,
      );
      meetings++;
    }
  }
  day = addDays(day, 1);
}

// --- board games and plays (property names follow a real collection's) ------------------------
const games = [
  ["Wingspan", 1, 5, 70, 2.5, "nature", 60, false], ["Catan", 3, 4, 90, 2.3, "trading", 45, true],
  ["Azul", 2, 4, 40, 1.8, "abstract", 35, true], ["Ticket to Ride", 2, 5, 60, 1.8, "trains", 45, true],
  ["Terraforming Mars", 1, 5, 120, 3.3, "space", 70, false], ["Spirit Island", 1, 4, 120, 4.0, "fantasy", 80, false],
  ["Codenames", 2, 8, 15, 1.3, "party", 20, true], ["7 Wonders Duel", 2, 2, 30, 2.2, "civilization", 30, true],
  ["Everdell", 1, 4, 80, 2.8, "nature", 60, true], ["Gloomhaven: Jaws of the Lion", 1, 4, 120, 3.6, "fantasy", 50, false],
  ["Carcassonne", 2, 5, 45, 1.9, "tiles", 35, true], ["Patchwork", 2, 2, 30, 1.6, "abstract", 25, true],
  ["Brass: Birmingham", 2, 4, 120, 3.9, "economic", 75, false], ["Cascadia", 1, 4, 45, 1.8, "nature", 40, true],
  ["The Crew", 2, 5, 20, 2.0, "space", 15, true], ["Dune: Imperium", 1, 4, 120, 3.0, "sci-fi", 55, false],
  ["Root", 2, 4, 90, 3.7, "fantasy", 60, false], ["Splendor", 2, 4, 30, 1.8, "trading", 35, true],
  ["Kingdomino", 2, 4, 15, 1.2, "tiles", 20, true], ["Arkham Horror LCG", 1, 2, 120, 3.4, "horror", 50, false],
  ["Love Letter", 2, 6, 20, 1.2, "party", 12, true], ["Twilight Imperium", 3, 6, 480, 4.3, "space", 150, false],
  ["Dixit", 3, 8, 30, 1.2, "party", 35, true], ["Hanabi", 2, 5, 25, 1.7, "cooperative", 10, true],
];
const players = ["Me", "Ana Ruiz", "Ben Okafor", "Dana Kim", "Gus Lindqvist", "Iris Moreau", "Kai Peters"];
const playCounts = new Map(games.map((g) => [g[0], 0]));
const popularity = games.map((g) => (g[4] < 2.6 ? 3 : g[4] < 3.5 ? 1.6 : 0.6) * (g[0] === "Twilight Imperium" ? 0 : 1));
const totalPop = popularity.reduce((a, b) => a + b, 0);
day = new Date("2025-10-03T00:00:00Z");
while (day < new Date("2026-10-03T00:00:00Z")) {
  const wd = day.getUTCDay();
  const chance = wd === 5 || wd === 6 ? 0.55 : wd === 0 ? 0.3 : 0.08;
  if (rnd() < chance) {
    let r = rnd() * totalPop;
    let gi = 0;
    while (r > popularity[gi]) r -= popularity[gi++];
    const g = games[gi];
    const n = Math.max(g[1], Math.min(g[2], 2 + Math.floor(rnd() * 3)));
    const who = ["Me", ...sample(players.slice(1), n - 1)];
    const skill = { Me: 1.1, "Ana Ruiz": 1.3, "Ben Okafor": 0.9, "Dana Kim": 1.0, "Gus Lindqvist": 1.2, "Iris Moreau": 0.8, "Kai Peters": 1.0 };
    const winner = who.map((w) => [w, rnd() * skill[w]]).sort((a, b) => b[1] - a[1])[0][0];
    const duration = Math.round(g[3] * between(0.8, 1.4) + 5 * (n - 2));
    playCounts.set(g[0], playCounts.get(g[0]) + 1);
    note(
      `notes/2_areas/boardgames/plays/${iso(day)} ${g[0].replace(/:/g, "")}.md`,
      { type: "play", tags: ["boardgame/play"], date: iso(day), game: link(g[0]), participants: who, winner, duration },
      `Played ${link(g[0])}. ${winner === "Me" ? "I won." : `${winner} won.`}`,
    );
  }
  day = addDays(day, 1);
}
for (const [name, min, max, time, complexity, theme, price, kids] of games) {
  const played = playCounts.get(name);
  note(
    `notes/2_areas/boardgames/games/${name.replace(/:/g, "")}.md`,
    {
      type: "boardgame",
      tags: ["boardgame"],
      players_min: min,
      players: max,
      time,
      complexity,
      theme,
      price,
      kids,
      owned: name !== "Twilight Imperium" || true,
      played_times: played,
    },
    `# ${name}\n\n${min === max ? `${min}` : `${min}–${max}`} players, about ${time} minutes, complexity ${complexity}. ${played ? `Played ${played} time${played > 1 ? "s" : ""} this year.` : "Not played this year."}\n`,
  );
}

// --- travel ------------------------------------------------------------------------------------
const places = {
  "New York": [40.71, -74.01, "USA", "840"], Lisbon: [38.72, -9.14, "Portugal", "620"], Porto: [41.15, -8.61, "Portugal", "620"],
  London: [51.51, -0.13, "UK", "826"], Paris: [48.86, 2.35, "France", "250"], Berlin: [52.52, 13.4, "Germany", "276"],
  Kyiv: [50.45, 30.52, "Ukraine", "804"], Tokyo: [35.68, 139.69, "Japan", "392"], Kyoto: [35.01, 135.77, "Japan", "392"],
  "Mexico City": [19.43, -99.13, "Mexico", "484"], "San Francisco": [37.77, -122.42, "USA", "840"], Reykjavik: [64.15, -21.94, "Iceland", "352"],
  "Cape Town": [-33.92, 18.42, "South Africa", "710"], Rome: [41.9, 12.5, "Italy", "380"], Barcelona: [41.39, 2.17, "Spain", "724"],
  Athens: [37.98, 23.73, "Greece", "300"], Montreal: [45.5, -73.57, "Canada", "124"], Lima: [-12.05, -77.04, "Peru", "604"],
  Cusco: [-13.53, -71.97, "Peru", "604"], "Buenos Aires": [-34.6, -58.38, "Argentina", "032"], Bangkok: [13.76, 100.5, "Thailand", "764"],
  Atlanta: [33.75, -84.39, "USA", "840"],
};
for (const [name, [lat, lon, country, country_id]] of Object.entries(places)) {
  note(`notes/2_areas/travel/places/${name}.md`, { type: "place", tags: ["place"], lat, lon, country, country_id }, `# ${name}`);
}
// One note per trip: purpose, dates, and the stops in order (legs are drawn between consecutive stops).
const trips = [
  ["2024-03-08", "2024-03-15", "Mexico City", "Personal", ["New York", "Mexico City", "New York"], []],
  ["2024-06-20", "2024-07-02", "Italy and Greece", "Family", ["New York", "Rome", "Athens", "New York"], ["Alex", "Mia"]],
  ["2024-10-11", "2024-10-14", "Montreal long weekend", "Personal", ["New York", "Montreal", "New York"], ["Alex"]],
  ["2024-12-20", "2025-01-05", "Peru and Argentina", "Family", ["New York", "Lima", "Cusco", "Buenos Aires", "New York"], ["Alex", "Mia"]],
  ["2025-02-10", "2025-02-22", "Winter escape", "Personal", ["New York", "Lisbon", "Porto", "London", "New York"], []],
  ["2025-05-03", "2025-05-07", "San Francisco offsite", "Work", ["New York", "San Francisco", "New York"], ["Ana Ruiz", "Dana Kim"]],
  ["2025-07-12", "2025-08-09", "Summer in Europe", "Family", ["New York", "Reykjavik", "Berlin", "Kyiv", "Paris", "Barcelona", "New York"], ["Alex", "Mia"]],
  ["2025-10-09", "2025-10-13", "AT Georgia", "Personal", ["New York", "Atlanta", "New York"], ["Ben Okafor"]],
  ["2025-11-14", "2025-12-02", "Japan and Thailand", "Personal", ["New York", "Tokyo", "Kyoto", "Bangkok", "New York"], ["Alex"]],
  ["2026-01-20", "2026-01-23", "London kickoff", "Work", ["New York", "London", "New York"], ["Jon Bell"]],
  ["2026-03-14", "2026-04-01", "Cape Town and Lisbon", "Family", ["New York", "Cape Town", "Lisbon", "New York"], ["Alex", "Mia"]],
  ["2026-06-08", "2026-06-11", "Berlin conference", "Work", ["New York", "Berlin", "New York"], ["Chen Wei"]],
  ["2026-09-15", "2026-09-18", "Atlanta client visit", "Work", ["New York", "Atlanta", "New York"], ["Maya Patel"]],
];
const nightsOf = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
for (const [start, end, title, purpose, stops, companions] of trips) {
  note(
    `notes/2_areas/travel/trips/${start.slice(0, 7)} ${title}.md`,
    { type: "trip", tags: ["trip"], purpose, start, end, nights: nightsOf(start, end), legs: stops.map(link), companions },
    `# ${title}\n\n${stops.map(link).join(" → ")}\n\n${nightsOf(start, end)} nights, a ${purpose.toLowerCase()} trip${companions.length ? `, with ${companions.join(" and ")}` : ", solo"}.\n`,
  );
}

// --- journal -------------------------------------------------------------------------------------
day = new Date("2026-04-01T00:00:00Z");
let mood = 3.2;
while (day <= new Date("2026-09-30T00:00:00Z")) {
  const wd = day.getUTCDay();
  const sleep = Math.round(Math.max(4.5, Math.min(9.5, 7 + 0.8 * gauss() + (wd === 6 ? 0.8 : 0))) * 10) / 10;
  // Mood drifts, lifts at weekends and after a good night.
  mood = Math.max(1, Math.min(5, mood * 0.6 + 0.4 * (3.1 + (wd === 0 || wd === 6 ? 0.5 : 0) + 0.9 * (sleep - 7) + 0.7 * gauss())));
  const habits = [];
  if (rnd() < (wd === 1 || wd === 3 || wd === 5 ? 0.75 : 0.25)) habits.push("gym");
  if (rnd() < 0.6) habits.push("read");
  if (rnd() < 0.4 + (sleep > 7.5 ? 0.2 : 0)) habits.push("meditate");
  if (rnd() < 0.7) habits.push("walk");
  const m = Math.round(mood);
  note(`notes/journal/${iso(day)}.md`, {
    type: "journal",
    tags: ["journal"],
    date: iso(day),
    mood: m,
    energy: Math.max(1, Math.min(5, Math.round(m + 0.5 * gauss() + (sleep - 7) * 0.4))),
    sleep,
    habits,
  }, lorem(10 + Math.floor(rnd() * 60)));
  day = addDays(day, 1);
}

// --- reading: when each book was read, how long it took, what was abandoned ---------------------
const books = [
  ["The Overstory", "Richard Powers", "fiction", 502, 5, null], ["Project Hail Mary", "Andy Weir", "sci-fi", 476, 5, null],
  ["Sapiens", "Yuval Noah Harari", "non-fiction", 443, 4, "9780062316097"], ["Piranesi", "Susanna Clarke", "fantasy", 272, 5, "9781635575637"],
  ["The Power Broker", "Robert A. Caro", "history", 1246, null, null], ["Klara and the Sun", "Kazuo Ishiguro", "fiction", 303, 4, null],
  ["Dune", "Frank Herbert", "sci-fi", 412, 5, "9780441172719"], ["Educated", "Tara Westover", "non-fiction", 334, 5, "9780399590504"],
  ["The Name of the Wind", "Patrick Rothfuss", "fantasy", 662, 4, "9780756404741"], ["Thinking, Fast and Slow", "Daniel Kahneman", "non-fiction", 499, null, "9780374533557"],
  ["A Walk in the Woods", "Bill Bryson", "non-fiction", 276, 4, null], ["The Left Hand of Darkness", "Ursula K. Le Guin", "sci-fi", 304, 5, "9780441478125"],
  ["Gone Girl", "Gillian Flynn", "thriller", 415, 3, "9780307588371"], ["War and Peace", "Leo Tolstoy", "fiction", 1225, null, null],
  ["The Guns of August", "Barbara W. Tuchman", "history", 511, 4, null], ["Neuromancer", "William Gibson", "sci-fi", 271, 3, "9780441569595"],
  ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", "fiction", 416, 4, null], ["The Hobbit", "J.R.R. Tolkien", "fantasy", 310, 5, "9780547928227"],
  ["The Body Keeps the Score", "Bessel van der Kolk", "non-fiction", 464, null, null], ["A Wizard of Earthsea", "Ursula K. Le Guin", "fantasy", 183, 4, "9780547773742"],
  ["The Silk Roads", "Peter Frankopan", "history", 636, 4, null], ["The Girl with the Dragon Tattoo", "Stieg Larsson", "thriller", 465, 3, "9780307454546"],
  ["Foundation", "Isaac Asimov", "sci-fi", 244, 4, "9780553293357"], ["Lincoln in the Bardo", "George Saunders", "fiction", 343, 4, null],
  ["The Three-Body Problem", "Liu Cixin", "sci-fi", 400, null, null], ["SPQR", "Mary Beard", "history", 608, null, null],
];
const pace = { fiction: 28, "sci-fi": 32, fantasy: 30, "non-fiction": 20, history: 16, thriller: 45 };
let cursor = new Date("2024-10-01T00:00:00Z");
const readingSummary = { finished: 0, abandoned: 0, pages: 0 };
books.forEach(([title, author, genre, pages, rating, isbn], i) => {
  const started = addDays(cursor, Math.floor(between(2, 14)));
  const days = Math.max(3, Math.round((pages / pace[genre]) * between(0.7, 1.6)));
  const last = i === books.length - 1;
  const abandon = rating === null && !last && i !== books.length - 2;
  const status = last || i === books.length - 2 ? "reading" : abandon ? "abandoned" : "finished";
  const end = status === "reading" ? null : addDays(started, abandon ? Math.round(days * between(0.2, 0.5)) : days);
  if (status === "finished") { readingSummary.finished++; readingSummary.pages += pages; }
  if (status === "abandoned") readingSummary.abandoned++;
  note(
    `notes/2_areas/reading/${title}.md`,
    {
      type: "book", tags: ["book"], author, genre, pages, rating: status === "finished" ? rating : null, status,
      started: iso(started), finished: status === "finished" ? iso(end) : null, abandoned: status === "abandoned" ? iso(end) : null, isbn,
    },
    `# ${title}\n\n*${author}*, ${pages} pages. ${status === "finished" ? `Read in ${Math.round((end - started) / 864e5)} days${rating ? `, ${"★".repeat(rating)}${"☆".repeat(5 - rating)}` : ""}.` : status === "abandoned" ? `Put down after ${Math.round((end - started) / 864e5)} days.` : "On the nightstand."}\n\n## Notes\n\n- ${pick(["Slow start, worth it after the first third.", "Read most of it on the subway.", "Recommended by Ana.", "Borrowed from the library.", "Kept underlining whole pages.", "Lighter than I expected."])}\n`,
  );
  // The next book starts a little before or after this one ends: overlaps are normal.
  cursor = addDays(started, Math.round(days * between(0.5, 1.05)));
});

// --- resources and inbox (for a vault that looks lived in) ---------------------------------------
const topics = ["dataviz", "pkm", "cooking", "urbanism", "finance", "outdoors"];
for (let i = 0; i < 30; i++) {
  const topic = pick(topics);
  note(`notes/3_resources/${topic}/${topic} note ${i + 1}.md`, { type: "resource", tags: [`resource/${topic}`], area: topic }, lorem(40 + Math.floor(rnd() * 300)));
}
for (let i = 0; i < 8; i++) note(`notes/0_inbox/Inbox ${i + 1}.md`, { type: "inbox", created: iso(addDays(new Date("2026-09-20T00:00:00Z"), i)) }, lorem(8));

// --- the hike: three days on the Appalachian Trail in Georgia ------------------------------------
// Waypoints are approximate (public trail landmarks, rounded); the track between them is synthetic.
const days = [
  ["2025-10-10", "Springer Mountain", "Hawk Mountain Shelter", [
    [34.6266, -84.1939, 1152, "Springer Mountain"], [34.6435, -84.1786, 869, ""], [34.6504, -84.1693, 771, "Three Forks"],
    [34.6600, -84.1500, 900, ""], [34.6668, -84.1376, 975, "Hawk Mountain Shelter"]]],
  ["2025-10-11", "Hawk Mountain Shelter", "Woody Gap", [
    [34.6668, -84.1376, 975, "Hawk Mountain Shelter"], [34.6710, -84.1162, 870, "Hightower Gap"], [34.6620, -84.0990, 1000, "Sassafras Mountain"],
    [34.6537, -84.0852, 860, "Cooper Gap"], [34.6560, -84.0600, 990, "Justus Mountain"], [34.6545, -84.0407, 860, "Gooch Mountain Shelter"],
    [34.6513, -84.0182, 849, "Gooch Gap"], [34.6680, -84.0050, 1010, ""], [34.6775, -83.9997, 963, "Woody Gap"]]],
  ["2025-10-12", "Woody Gap", "Neel Gap", [
    [34.6775, -83.9997, 963, "Woody Gap"], [34.6900, -83.9900, 1139, "Big Cedar Mountain"], [34.7050, -83.9750, 980, "Lance Creek"],
    [34.7208, -83.9594, 991, "Jarrard Gap"], [34.7350, -83.9450, 1200, ""], [34.7400, -83.9370, 1359, "Blood Mountain"],
    [34.7347, -83.9184, 953, "Neel Gap"]]],
];
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  const dφ = rad(b[0] - a[0]);
  const dλ = rad(b[1] - a[1]);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const hikeNotes = [];
const TRAIL_M = 31.7 * 1609.34; // Springer Mountain to Neel Gap along the trail
/** One day's GPS points. `swing` (metres) sizes the switchbacks; the real track is ~1.5× the straight line. */
function buildDay(di, wps, swing) {
  const r = mulberry32(900 + di);
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const rows = ["time,lat,lon,ele_m,hr"];
  let t = new Date(`${days[di][0]}T${di === 0 ? "09:40" : "08:15"}:00-04:00`).getTime();
  const legLengths = wps.slice(1).map((w, i) => hav(wps[i], w));
  const chord = legLengths.reduce((x, y) => x + y, 0);
  const breakAt = [0.33, 0.55, 0.8].map((f) => Math.round((f * chord) / 40));
  let step = 0, along = 0, length = 0, prev = null, prevEle = wps[0][2], hr = 95;
  const phase = r() * 10;
  for (let li = 0; li < legLengths.length; li++) {
    const a = wps[li], b = wps[li + 1];
    const n = Math.max(2, Math.round(legLengths[li] / 40));
    const vn = (b[0] - a[0]) * 111320, ve = (b[1] - a[1]) * 111320 * Math.cos(rad(a[0]));
    const L = Math.hypot(vn, ve) || 1;
    for (let k = li === 0 ? 0 : 1; k <= n; k++) {
      const f = k / n;
      const d = along + f * legLengths[li];
      // Switchbacks and ridge-line wiggle, perpendicular to the chord, zero at the waypoints.
      const o = Math.sin(Math.PI * f) * (swing * Math.sin(d / 35) + 120 * Math.sin(d / 230 + phase) + 60 * Math.sin(d / 71));
      const lat0 = a[0] + (b[0] - a[0]) * f, lon0 = a[1] + (b[1] - a[1]) * f;
      const lat = lat0 + (o * (-ve / L)) / 111320;
      const lon = lon0 + (o * (vn / L)) / (111320 * Math.cos(rad(lat0)));
      const ele = a[2] + (b[2] - a[2]) * (0.5 - 0.5 * Math.cos(Math.PI * f)) + Math.sin(Math.PI * f) * (28 * Math.sin(d / 410 + phase) + 9 * Math.sin(d / 97));
      const seg = prev ? hav(prev, [lat, lon]) : 0;
      length += seg;
      const grade = seg > 0 ? (ele - prevEle) / seg : 0;
      // Tobler's hiking function, slowed by a 12 kg pack and the day's fatigue.
      const kmh = 6 * Math.exp(-3.5 * Math.abs(grade + 0.05)) * (0.8 - 0.05 * (d / chord)) * (1 + 0.08 * g());
      t += (seg / 1000 / Math.max(0.8, kmh)) * 3600 * 1000;
      hr = 0.8 * hr + 0.2 * Math.max(88, Math.min(172, 102 + 900 * Math.max(0, grade) + 6 * g()));
      rows.push(`${new Date(t).toISOString()},${lat.toFixed(6)},${lon.toFixed(6)},${ele.toFixed(1)},${Math.round(hr)}`);
      if (breakAt.includes(step)) {
        const minutes = step === breakAt[1] ? 35 : 10;
        for (let m = 1; m <= minutes; m += 2) {
          t += 120 * 1000;
          hr = 0.6 * hr + 0.4 * 84;
          rows.push(`${new Date(t).toISOString()},${(lat + 0.00001 * g()).toFixed(6)},${(lon + 0.00001 * g()).toFixed(6)},${ele.toFixed(1)},${Math.round(hr)}`);
        }
      }
      prev = [lat, lon];
      prevEle = ele;
      step++;
    }
    along += legLengths[li];
  }
  return { rows, length };
}
// Pick the switchback size that makes the three days add up to the real trail length.
let swing = 20, bestErr = Infinity;
for (let s = 0; s <= 200; s += 2) {
  const total = days.reduce((sum, [, , , wps], di) => sum + buildDay(di, wps, s).length, 0);
  if (Math.abs(total - TRAIL_M) < bestErr) { bestErr = Math.abs(total - TRAIL_M); swing = s; }
}
let hikeMiles = 0;
const dayMiles = [];
days.forEach(([date, from, to, wps], di) => {
  const { rows, length } = buildDay(di, wps, swing);
  hikeMiles += length / 1609.34;
  dayMiles.push(length / 1609.34);
  const csv = `attachments/hikes/${date} ${from} to ${to}.csv`.replace(/ /g, "-").toLowerCase();
  write(csv, rows.join("\n") + "\n");
  const name = `Day ${di + 1} ${from} to ${to}`;
  hikeNotes.push(name);
  note(
    `notes/2_areas/hiking/AT Georgia 2025/${name}.md`,
    {
      type: "hike-day",
      tags: ["hike"],
      hike: link("AT Georgia 2025"),
      day: di + 1,
      date,
      from,
      to,
      track: csv,
      weather: ["clear, cool", "overcast, light wind", "sunny, windy on Blood Mountain"][di],
    },
    `Waypoints: ${wps.map((w) => w[3]).filter(Boolean).join(" → ")}. Track synthetic, route approximate.`,
  );
});
note(
  "notes/2_areas/hiking/AT Georgia 2025/AT Georgia 2025.md",
  { type: "hike", tags: ["hike"], start: "2025-10-10", end: "2025-10-12", trail: "Appalachian Trail", section: "Springer Mountain to Neel Gap" },
  `# AT Georgia 2025\n\nThree days from Springer Mountain to Neel Gap over Blood Mountain. ${hikeNotes.map(link).join(", ")}.\n\nThe GPS tracks in attachments/hikes are generated for the demo: the waypoints follow the real trail roughly, the line between them, the times and the heart rate are invented. Not for navigation.`,
);

// --- Napoleon's Russian campaign, 1812: Minard's data and one note per battle ---------------------
// Troop strength, positions, towns and retreat temperatures as charted by Charles Joseph Minard (1869),
// in the form of the HistData "Minard" dataset (public domain). Battle places and dates are approximate.
const troops = [
  [24.0, 54.9, 340000, "A", 1], [24.5, 55.0, 340000, "A", 1], [25.5, 54.5, 340000, "A", 1], [26.0, 54.7, 320000, "A", 1],
  [27.0, 54.8, 300000, "A", 1], [28.0, 54.9, 280000, "A", 1], [28.5, 55.0, 240000, "A", 1], [29.0, 55.1, 210000, "A", 1],
  [30.0, 55.2, 180000, "A", 1], [30.3, 55.3, 175000, "A", 1], [32.0, 54.8, 145000, "A", 1], [33.2, 54.9, 140000, "A", 1],
  [34.4, 55.5, 127100, "A", 1], [35.5, 55.4, 100000, "A", 1], [36.0, 55.5, 100000, "A", 1], [37.6, 55.8, 100000, "A", 1],
  [37.7, 55.7, 100000, "R", 1], [37.5, 55.7, 98000, "R", 1], [37.0, 55.0, 97000, "R", 1], [36.8, 55.0, 96000, "R", 1],
  [35.4, 55.3, 87000, "R", 1], [34.3, 55.2, 55000, "R", 1], [33.3, 54.8, 37000, "R", 1], [32.0, 54.6, 24000, "R", 1],
  [30.4, 54.4, 20000, "R", 1], [29.2, 54.3, 20000, "R", 1], [28.5, 54.2, 20000, "R", 1], [28.3, 54.3, 20000, "R", 1],
  [27.5, 54.5, 20000, "R", 1], [26.8, 54.3, 12000, "R", 1], [26.4, 54.4, 14000, "R", 1], [25.0, 54.4, 8000, "R", 1],
  [24.4, 54.4, 4000, "R", 1], [24.2, 54.4, 4000, "R", 1], [24.1, 54.4, 4000, "R", 1],
  [24.0, 55.1, 60000, "A", 2], [24.5, 55.2, 60000, "A", 2], [25.5, 54.7, 60000, "A", 2], [26.6, 55.7, 40000, "A", 2],
  [27.4, 55.6, 33000, "A", 2], [28.7, 55.5, 33000, "R", 2], [29.2, 54.2, 30000, "R", 2], [28.5, 54.1, 30000, "R", 2],
  [28.3, 54.2, 28000, "R", 2],
  [24.0, 55.2, 22000, "A", 3], [24.5, 55.3, 22000, "A", 3], [24.6, 55.8, 6000, "A", 3], [24.6, 55.8, 6000, "R", 3],
  [24.2, 54.4, 6000, "R", 3], [24.1, 54.4, 6000, "R", 3],
];
write("attachments/history/minard-troops.csv", ["lon,lat,survivors,direction,group,seq", ...troops.map((t, i) => [...t, i].join(","))].join("\n") + "\n");
// pos: where the town's name sits (t/b/l/r); "-" hides it where a battle of the same name labels the spot.
const towns = [
  [24.0, 55.0, "Kowno", "t"], [25.3, 54.7, "Wilna", "t"], [26.4, 54.4, "Smorgoni", "b"], [26.8, 54.3, "Molodexno", "b"], [27.7, 55.2, "Gloubokoe", "t"],
  [27.6, 53.9, "Minsk", "b"], [28.5, 54.3, "Studienska", "-"], [28.7, 55.5, "Polotzk", "-"], [29.2, 54.4, "Bobr", "b"], [30.2, 55.3, "Witebsk", "-"],
  [30.4, 54.5, "Orscha", "b"], [30.4, 53.9, "Mohilow", "b"], [32.0, 54.8, "Smolensk", "-"], [33.2, 54.9, "Dorogobouge", "t"], [34.3, 55.2, "Wixma", "-"],
  [34.4, 55.5, "Chjat", "t"], [36.0, 55.5, "Mojaisk", "-"], [37.6, 55.8, "Moscou", "t"], [36.6, 55.3, "Tarantino", "-"], [36.5, 55.0, "Malo-Jarosewli", "-"],
];
write("attachments/history/minard-cities.csv", ["lon,lat,city,pos", ...towns.map((t) => t.join(","))].join("\n") + "\n");
// Temperature on the retreat in degrees Réaumur, as Minard gave it (°C = °R × 1.25).
// lat: where the retreat path is at that longitude, so the chart can draw Minard's lines from the temperature up to the army.
const temps = [[37.6, 55.7, 0, "Oct 18"], [36.0, 55.1, 0, "Oct 24"], [33.2, 54.8, -9, "Nov 9"], [32.0, 54.6, -21, "Nov 14"], [29.2, 54.3, -11, "Nov 24"], [28.5, 54.2, -20, "Nov 28"], [27.2, 54.4, -24, "Dec 1"], [26.7, 54.3, -30, "Dec 6"], [25.3, 54.4, -26, "Dec 7"]];
write("attachments/history/minard-temps.csv", ["lon,lat,temp_r,date", ...temps.map((t) => t.join(","))].join("\n") + "\n");
const battles = [
  ["Battle of Ostrovno", "1812-07-25", "1812-07-27", 55.2, 29.9, "Inconclusive", "advance", "Rearguard fighting west of Vitebsk as the Russian armies fall back."],
  ["First Battle of Polotsk", "1812-08-17", "1812-08-18", 55.48, 28.78, "French victory", "advance", "On the northern flank, Oudinot and Saint-Cyr hold Polotsk against Wittgenstein."],
  ["Battle of Smolensk", "1812-08-16", "1812-08-18", 54.78, 32.05, "French victory", "advance", "The city burns; the Russian armies escape east again."],
  ["Battle of Borodino", "1812-09-07", "1812-09-07", 55.52, 35.82, "French tactical victory", "advance", "The bloodiest single day of the campaign, west of Mozhaysk. The road to Moscow opens."],
  ["Battle of Tarutino", "1812-10-18", "1812-10-18", 55.2, 36.95, "Russian victory", "retreat", "Kutuzov strikes Murat's camp south-west of Moscow; Napoleon decides to leave."],
  ["Second Battle of Polotsk", "1812-10-18", "1812-10-20", 55.48, 28.78, "Russian victory", "retreat", "Wittgenstein retakes Polotsk, threatening the line of retreat."],
  ["Battle of Maloyaroslavets", "1812-10-24", "1812-10-24", 55.01, 36.47, "Inconclusive", "retreat", "The town changes hands several times; the Grande Armée is turned back onto the devastated Smolensk road."],
  ["Battle of Vyazma", "1812-11-03", "1812-11-03", 55.21, 34.29, "Russian victory", "retreat", "The rearguard is mauled as the cold begins."],
  ["Battle of Krasnoi", "1812-11-15", "1812-11-18", 54.56, 31.43, "Russian victory", "retreat", "Days of running fights west of Smolensk; Ney's corps is nearly lost."],
  ["Battle of the Berezina", "1812-11-26", "1812-11-29", 54.33, 28.36, "French escape", "retreat", "Engineers bridge the river at Studienka; the remnant crosses under fire, thousands do not."],
];
for (const [name, date, end, lat, lon, outcome, phase, text] of battles) {
  note(
    `notes/3_resources/history/Russian campaign 1812/battles/${name}.md`,
    { type: "battle", tags: ["history/1812"], campaign: link("Russian campaign 1812"), date, end, lat, lon, outcome, phase },
    `# ${name}\n\n${text}\n\nPart of [[Russian campaign 1812]].`,
  );
}

// --- shared data -----------------------------------------------------------------------------------
const world = new URL("../test-vault/geo/world-110m.json", import.meta.url).pathname;
mkdirSync(join(ROOT, "attachments/geo"), { recursive: true });
if (existsSync(world)) copyFileSync(world, join(ROOT, "attachments/geo/world-110m.json"));

// --- Obsidian config: Bases on, Agate enabled, property types declared -----------------------------
const obs = (name, value) => write(`.obsidian/${name}`, JSON.stringify(value, null, 2) + "\n");
obs("community-plugins.json", ["agate"]);
obs("core-plugins.json", {
  "file-explorer": true, "global-search": true, switcher: true, graph: true, backlink: true, canvas: true,
  "outgoing-link": true, "tag-pane": true, properties: true, "page-preview": true, "command-palette": true,
  outline: true, "word-count": true, "file-recovery": true, bases: true,
});
obs("app.json", { attachmentFolderPath: "attachments", newFileLocation: "folder", newFileFolderPath: "notes/0_inbox" });
obs("appearance.json", { theme: "obsidian" });
const typeOf = (t, keys) => Object.fromEntries(keys.map((k) => [k, t]));
obs("types.json", {
  types: {
    ...typeOf("date", ["date", "start", "due", "end", "published", "created"]),
    ...typeOf("number", ["priority", "duration", "players_min", "players", "time", "complexity", "price", "played_times", "lat", "lon", "mood", "energy", "sleep", "rating", "pages", "day"]),
    ...typeOf("multitext", ["tags", "people", "attendees", "habits", "participants"]),
    ...typeOf("checkbox", ["kids", "owned"]),
    ...typeOf("text", ["type", "area", "status", "kind", "theme", "winner", "trip", "mode", "country", "country_id", "author", "genre", "isbn", "role", "team", "from", "to", "project", "game", "hike", "track", "weather"]),
  },
});

// --- bases -----------------------------------------------------------------------------------------
const base = (name, text) => write(`bases/${name}.base`, text.trim() + "\n");
base("Travel", `
filters:
  or:
    - type == "trip"
    - type == "place"
views:
  - type: agate
    name: Globe
    order: [file.name, purpose, start, end, legs]
    specFile: charts/travel-globe.vg.json
  - type: agate
    name: Countries
    order: [file.name, country]
    specFile: charts/countries-visited.vl.json
  - type: table
    name: Trips
    filters:
      and:
        - type == "trip"
    order: [file.name, purpose, start, nights, companions]
    sort:
      - property: start
        direction: DESC
`);
base("Board games", `
filters:
  or:
    - type == "boardgame"
    - type == "play"
views:
  - type: agate
    name: Collection
    order: [file.name, complexity, time, players, theme, played_times]
    specFile: charts/boardgame-collection.vl.json
  - type: agate
    name: Game nights
    order: [file.name, date, game, winner]
    specFile: charts/boardgame-plays.vl.json
  - type: table
    name: Games
    filters:
      and:
        - type == "boardgame"
    order: [file.name, players, time, complexity, theme, played_times, price]
    sort:
      - property: played_times
        direction: DESC
`);
base("Projects", `
filters:
  and:
    - type == "project"
views:
  - type: agate
    name: Timeline
    order: [file.name, area, status, start, due, priority]
    sort:
      - property: start
        direction: ASC
    specFile: charts/project-gantt.vl.json
  - type: table
    name: Table
    order: [file.name, area, status, priority, start, due]
`);
base("Meetings", `
filters:
  or:
    - type == "meeting"
    - type == "person"
    - type == "project"
views:
  - type: agate
    name: Who I meet
    filters:
      and:
        - type == "meeting"
    order: [file.name, date, kind, duration, attendees]
    specFile: charts/meetings-heatmap.vl.json
  - type: agate
    name: People and projects
    order: [file.name, type, team, area]
    specFile: charts/people-graph.vg.json
  - type: table
    name: Meetings
    filters:
      and:
        - type == "meeting"
    order: [file.name, date, kind, duration, project]
`);
base("Hiking", `
filters:
  and:
    - type == "hike-day"
views:
  - type: agate
    name: Dashboard
    order: [file.name, day, date, from, to]
    sort:
      - property: day
        direction: ASC
    specFile: charts/hike-dashboard.vl.json
  - type: table
    name: Days
    order: [day, date, from, to, weather, track]
`);
base("Journal", `
filters:
  and:
    - type == "journal"
views:
  - type: agate
    name: Habits
    order: [date, habits, mood]
    specFile: charts/habit-grid.vl.json
  - type: agate
    name: Mood
    order: [date, mood, energy, sleep]
    specFile: charts/mood-beeswarm.vg.json
  - type: table
    name: Table
    order: [date, mood, energy, sleep, habits]
`);
base("Reading", `
filters:
  and:
    - type == "book"
views:
  - type: agate
    name: Reading year
    order: [file.name, author, genre, started, finished, status, rating]
    sort:
      - property: started
        direction: ASC
    specFile: charts/reading-journey.vg.json
  - type: table
    name: Shelf
    order: [file.name, author, genre, pages, started, finished, status, rating]
    sort:
      - property: started
        direction: DESC
`);
base("Campaign 1812", `
filters:
  and:
    - type == "battle"
views:
  - type: agate
    name: Minard map
    order: [file.name, date, outcome, phase]
    specFile: charts/campaign-1812.vg.json
  - type: table
    name: Battles
    order: [file.name, date, end, outcome, phase]
    sort:
      - property: date
        direction: ASC
`);
base("Vault", `
filters:
  and:
    - file.inFolder("notes")
views:
  - type: agate
    name: Sunburst
    order: [file.name, file.folder, file.size]
    specFile: charts/vault-sunburst.vg.json
  - type: table
    name: Largest files
    order: [file.name, file.folder, file.size]
    sort:
      - property: file.size
        direction: DESC
`);

// --- area notes: one per area, written like notes someone keeps, with numbers from the data ----------
// look: which of the three screenshot looks the note is shot in (docs/demo-story.md).
const of = (type) => NOTES.filter((n) => n.props.type === type);
const unlink = (v) => String(v).replace(/^\[\[|\]\]$/g, "");
const fmt = (n) => n.toLocaleString("en-US");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const TODAY = new Date("2026-10-07T00:00:00Z");
function areaNote(path, { title, look, tags = [], dek, stats, intro, sections }) {
  const stat = `> [!stats]\n${stats.map(([v, l]) => `> - **${v}** ${l}`).join("\n")}`;
  const fm = `---\ntype: hub\nlook: ${look}\ntags: [${["hub", ...tags].join(", ")}]\ncssclasses: [agate-area]\n---\n`;
  write(path, `${fm}# ${title}\n\n*${dek}*\n\n${stat}\n\n${intro}\n\n${sections.join("\n\n")}\n`);
}
const bullets = (xs) => xs.map((x) => `- ${x}`).join("\n");
const todos = (xs) => xs.map(([done, x]) => `- [${done ? "x" : " "}] ${x}`).join("\n");

// Travel
{
  const tripNotes = of("trip");
  const countries = new Set(trips.flatMap((t) => t[4]).map((p) => places[p][2]));
  const nights = trips.reduce((n, t) => n + nightsOf(t[0], t[1]), 0);
  const longest = tripNotes.reduce((a, b) => (b.props.nights > a.props.nights ? b : a));
  const visits = new Map();
  for (const t of trips) for (const p of new Set(t[4])) if (p !== "New York") visits.set(p, (visits.get(p) ?? 0) + 1);
  const topPlace = [...visits.entries()].sort((a, b) => b[1] - a[1])[0];
  const withWho = new Map();
  for (const t of trips) for (const c of t[5]) withWho.set(c, (withWho.get(c) ?? 0) + 1);
  const topWho = [...withWho.entries()].sort((a, b) => b[1] - a[1])[0];
  const by = (p) => tripNotes.filter((n) => n.props.purpose === p);
  const work = by("Work");
  areaNote("notes/2_areas/travel/Travel.md", {
    title: "Travel", look: "dark", tags: ["area/travel"],
    dek: "Where the last two and a half years went, and why.",
    stats: [[trips.length, "trips"], [countries.size, "countries"], [nights, "nights away"], [by("Family").length, "with family"]],
    intro: `Every trip is a note with its stops in order and a purpose (family, work, personal); places are notes with coordinates. The globe draws each leg as a great circle, so New York sprouts arcs in every direction. Drag to spin it, hover a route to see the trip, click to open it.`,
    sections: [
      "![[Travel.base#Globe]]",
      `## What I noticed\n\n${bullets([
        `The longest trip was [[${longest.name}]]: ${longest.props.nights} nights.`,
        `${topPlace[0]} keeps coming back (${plural(topPlace[1], "trip")}); after that, everywhere was a one-off.`,
        `${work.length} work trips, all short: ${work.map((n) => `[[${n.name}]]`).join(", ")}.`,
        `${topWho[0]} came along most often (${plural(topWho[1], "trip")}).`,
      ])}`,
      `## Next\n\n${todos([[false, "Japan in spring with Alex, this time Osaka and the Kumano Kodo"], [false, "Renew passport before March"], [true, "Collect receipts from [[2026-09 Atlanta client visit]]"]])}`,
      "## Where I've been\n\n![[Travel.base#Countries]]",
      "## Every trip\n\n![[Travel.base#Trips]]",
      "Related: [[AT Georgia 2025]] · [[Projects]]",
    ],
  });
}

// Reading
{
  const bookNotes = of("book");
  const done = bookNotes.filter((n) => n.props.status === "finished");
  const span = (n) => (new Date(n.props.finished ?? n.props.abandoned) - new Date(n.props.started)) / 864e5;
  const fastest = done.reduce((a, b) => (b.props.pages / span(b) > a.props.pages / span(a) ? b : a));
  const slowest = done.reduce((a, b) => (span(b) > span(a) ? b : a));
  const dropped = bookNotes.filter((n) => n.props.status === "abandoned");
  const now = bookNotes.filter((n) => n.props.status === "reading");
  const fives = done.filter((n) => n.props.rating === 5);
  const genreCount = new Map();
  for (const n of done) genreCount.set(n.props.genre, (genreCount.get(n.props.genre) ?? 0) + 1);
  const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0];
  areaNote("notes/2_areas/reading/Reading.md", {
    title: "Reading", look: "elegant", tags: ["area/reading"],
    dek: "Two years of books, mostly on the F train.",
    stats: [[readingSummary.finished, "finished"], [fmt(readingSummary.pages), "pages"], [readingSummary.abandoned, "abandoned"], [now.length, "on the nightstand"]],
    intro: `One bar per book, from the day I started to the day I finished or gave up; × marks the ones I put down. Switch the view to **Flow** to follow each genre to how it ended and how long it took. Each book is a note with dates, pages and a rating, so this page keeps itself up to date.`,
    sections: [
      "![[Reading.base#Reading year]]",
      `## What I noticed\n\n${bullets([
        `${topGenre[0][0].toUpperCase() + topGenre[0].slice(1)} wins on count (${topGenre[1]} finished), but the five-star list is all over the place: ${fives.slice(0, 4).map((n) => `[[${n.name}]]`).join(", ")}.`,
        `Fastest read: [[${fastest.name}]], about ${Math.round(fastest.props.pages / span(fastest))} pages a day. Slowest: [[${slowest.name}]], ${Math.round(span(slowest))} days.`,
        `Doorstoppers and dense non-fiction are where I stall. I put down ${dropped.map((n) => `[[${n.name}]] (${fmt(n.props.pages)} pages)`).join(", ")}.`,
      ])}`,
      `## Reading now\n\n${todos(now.map((n) => [false, `[[${n.name}]], ${n.props.pages} pages, started ${n.props.started}`]))}\n- [ ] Give [[War and Peace]] another go in the winter`,
      "## The shelf\n\n![[Reading.base#Shelf]]",
    ],
  });
}

// Board games
{
  const plays = of("play");
  const wins = new Map(), seats = new Map();
  for (const p of plays) for (const w of p.props.participants) {
    seats.set(w, (seats.get(w) ?? 0) + 1);
    if (p.props.winner === w) wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  const rate = (w) => (wins.get(w) ?? 0) / seats.get(w);
  const champ = [...seats.keys()].filter((w) => seats.get(w) >= 10).sort((a, b) => rate(b) - rate(a))[0];
  const ranked = [...playCounts.entries()].sort((a, b) => b[1] - a[1]);
  const shame = ranked.filter(([, n]) => n === 0).map(([g]) => g);
  const hours = Math.round(plays.reduce((h, p) => h + p.props.duration, 0) / 60);
  areaNote("notes/2_areas/boardgames/Board games.md", {
    title: "Board games", look: "colourful", tags: ["area/games"],
    dek: "Friday nights, Saturday nights, the same seven people.",
    stats: [[plays.length, "plays this year"], [hours, "hours at the table"], [games.length, "games on the shelf"], [shame.length, "never played"]],
    intro: `Every play is a note (who played, who won, how long); every game is a note with its complexity and length. Bubbles are sized by plays this year; the dashed rings are the shelf of shame.`,
    sections: [
      "![[Board games.base#Collection]]",
      `## What I noticed\n\n${bullets([
        `[[${ranked[0][0]}]] and [[${ranked[1][0]}]] are the table's favourites (${ranked[0][1]} and ${ranked[1][1]} plays).`,
        `[[${champ}]] wins ${Math.round(rate(champ) * 100)}% of the games she sits down to. I win ${Math.round(rate("Me") * 100)}%.`,
        `Not played once this year: ${shame.map((g) => `[[${g.replace(/:/g, "")}]]`).join(", ")}. All of them ${Math.min(...shame.map((g) => games.find((x) => x[0] === g)[4]))} or heavier on complexity.`,
      ])}`,
      `## Next\n\n${todos([[false, "Book a Saturday for [[Twilight Imperium]] (needs 6 and a whole day)"], [false, "Teach [[Spirit Island]] to Ben"], [true, "Sleeve [[Cascadia]]"]])}`,
      "## Game nights\n\n![[Board games.base#Game nights]]",
      "## The shelf\n\n![[Board games.base#Games]]",
    ],
  });
}

// Projects
{
  const ps = of("project");
  const st = (s) => ps.filter((p) => p.props.status === s);
  const late = ps.filter((p) => p.props.status !== "done" && new Date(p.props.due) < TODAY);
  const soon = st("active").filter((p) => (new Date(p.props.due) - TODAY) / 864e5 < 60).sort((a, b) => String(a.props.due).localeCompare(String(b.props.due)));
  areaNote("notes/1_projects/Projects.md", {
    title: "Projects", look: "elegant", tags: ["projects"],
    dek: "Work, home, health and learning on one timeline.",
    stats: [[st("active").length, "active"], [st("paused").length, "paused"], [st("idea").length, st("idea").length === 1 ? "idea" : "ideas"], [st("done").length, "done"]],
    intro: `Each project is a note with a start, a due date and a status; the dashed line is today. Anything that crosses it in ochre is paused and needs a decision.`,
    sections: [
      "![[Projects.base#Timeline]]",
      `## This quarter\n\n${bullets([
        ...soon.map((p) => `[[${p.name}]] is due ${p.props.due}.`),
        late.length ? `Overdue: ${late.map((p) => `[[${p.name}]]`).join(", ")}.` : "Nothing overdue.",
        `Paused: ${st("paused").map((p) => `[[${p.name}]]`).join(", ")}. Decide by the end of October: restart or drop.`,
      ])}`,
      `## To do\n\n${todos([[false, "Write the one-pager for [[Experiment platform]]"], [false, "Quotes from two contractors for [[Kitchen renovation]]"], [true, "Retro for [[Data catalog]]"]])}`,
      "## Who works on what\n\n![[Meetings.base#People and projects]]",
      "Related: [[Work]] · [[Journal]]",
    ],
  });
}

// Work
{
  const ms = of("meeting");
  const per = new Map(), mins = new Map();
  for (const m of ms) for (const a of m.props.attendees) {
    const w = unlink(a);
    per.set(w, (per.get(w) ?? 0) + 1);
    mins.set(w, (mins.get(w) ?? 0) + m.props.duration);
  }
  const top = [...per.entries()].sort((a, b) => b[1] - a[1]);
  const hours = Math.round(ms.reduce((h, m) => h + m.props.duration, 0) / 60);
  const weeks = 26;
  const kinds2 = new Map();
  for (const m of ms) kinds2.set(m.props.kind, (kinds2.get(m.props.kind) ?? 0) + 1);
  areaNote("notes/2_areas/work/Work.md", {
    title: "Work", look: "colourful", tags: ["area/work"],
    dek: "Who I spend my weeks with, and on what.",
    stats: [[ms.length, "meetings since April"], [hours, "hours"], [(hours / weeks).toFixed(1), "hours a week"], [per.size, "people"]],
    intro: `Every meeting is a note with its attendees and project. One row per person, one square per week; brighter means more meetings that week. The bars on the right are total hours.`,
    sections: [
      "![[Meetings.base#Who I meet]]",
      `## What I noticed\n\n${bullets([
        `[[${top[0][0]}]] and [[${top[1][0]}]] take the most time (${Math.round(mins.get(top[0][0]) / 60)} and ${Math.round(mins.get(top[1][0]) / 60)} hours).`,
        `[[${top[top.length - 1][0]}]] is down to ${plural(top[top.length - 1][1], "meeting")}: worth a coffee.`,
        `${kinds2.get("standup") ?? 0} standups, ${kinds2.get("1:1") ?? 0} one-on-ones, ${kinds2.get("review") ?? 0} reviews.`,
      ])}`,
      `## This week\n\n${todos([[false, "Prep the [[Pricing model v2]] review with [[Hana Sato]]"], [false, "Move standups to async on Fridays"], [true, "Send [[Partner API]] notes to [[Maya Patel]]"]])}`,
      "## People and projects\n\n![[Meetings.base#People and projects]]",
      "Related: [[Projects]]",
    ],
  });
}

// Journal
{
  const js = of("journal");
  const rateOf = (h) => js.filter((j) => j.props.habits.includes(h)).length / js.length;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const rested = js.filter((j) => j.props.sleep >= 7.5), tired = js.filter((j) => j.props.sleep < 6.5);
  const rMood = avg(rested.map((j) => j.props.mood)), tMood = avg(tired.map((j) => j.props.mood));
  const isWkend = (j) => [0, 6].includes(new Date(j.props.date).getUTCDay());
  const wkend = avg(js.filter(isWkend).map((j) => j.props.mood)), wkday = avg(js.filter((j) => !isWkend(j)).map((j) => j.props.mood));
  const habitRates = ["gym", "walk", "read", "meditate"].map((h) => [h, rateOf(h)]).sort((a, b) => a[1] - b[1]);
  const weakest = habitRates[0], strongest = habitRates[habitRates.length - 1];
  let best = 0, run = 0;
  for (const j of js) { run = j.props.habits.includes("walk") ? run + 1 : 0; best = Math.max(best, run); }
  areaNote("notes/journal/Journal.md", {
    title: "Journal", look: "dark", tags: ["journal"],
    dek: "Six months of mornings: habits, mood, sleep.",
    stats: [[js.length, "daily notes"], [`${Math.round(rateOf("walk") * 100)}%`, "days with a walk"], [`${Math.round(rateOf("gym") * 100)}%`, "with the gym"], [best, "day walking streak"]],
    intro: `Each daily note has a \`habits\` list and a mood, energy and sleep check-in. One row per habit, one square per week; brighter means more days that week. Below, one dot per day: height is mood, colour is energy, size is sleep.`,
    sections: [
      "![[Journal.base#Habits]]",
      `## What I noticed\n\n${bullets([
        rMood > tMood + 0.15
          ? `Sleep shows up in the mood: ${rMood.toFixed(1)} on average after 7.5 hours or more, ${tMood.toFixed(1)} after less than 6.5.`
          : `Sleep barely moves the mood (${rMood.toFixed(1)} after 7.5 hours or more, ${tMood.toFixed(1)} after less than 6.5). Weekends do: ${wkend.toFixed(1)} against ${wkday.toFixed(1)} on weekdays.`,
        `${{ gym: "The gym", walk: "Walking", read: "Reading", meditate: "Meditation" }[weakest[0]]} is the habit that slips (${Math.round(weakest[1] * 100)}% of days); ${{ gym: "the gym", walk: "walking", read: "reading", meditate: "meditation" }[strongest[0]]} sticks (${Math.round(strongest[1] * 100)}%).`,
      ])}`,
      "## Mood, day by day\n\n![[Journal.base#Mood]]",
      `## Experiments\n\n${todos([[false, "No screens after 10pm for two weeks, then compare"], [true, "Gym on Monday, Wednesday, Friday"]])}`,
    ],
  });
}

// Hiking
{
  const dayNotes = of("hike-day");
  areaNote("notes/2_areas/hiking/AT Georgia 2025/AT Georgia 2025.md", {
    title: "AT Georgia 2025", look: "dark", tags: ["area/hiking", "trip"],
    dek: "Springer Mountain to Neel Gap, three days in October 2025.",
    stats: [[hikeMiles.toFixed(1), "miles"], [3, "days"], ["4,458 ft", "Blood Mountain"], [2, "nights in shelters"]],
    intro: `The first 31 miles of the Appalachian Trail, from the southern terminus to the outfitter at Neel Gap. Each day is a note with its GPS track. Hover the route to read elevation, speed and heart rate at that point; drag across the profile to zoom into a stretch. At night the map switches to satellite.`,
    sections: [
      "![[Hiking.base#Dashboard]]",
      `## Day by day\n\n${bullets(dayNotes.map((d, i) => `[[${d.name}]]: ${dayMiles[i].toFixed(1)} mi, ${d.props.weather}.`))}`,
      `## Notes for next time\n\n${todos([[true, "Water at Gooch Gap was flowing"], [false, "Lighter quilt; the second night was warm"], [false, "Start day 3 earlier: Blood Mountain takes longer than it looks"]])}`,
      "## Days\n\n![[Hiking.base#Days]]",
      "Tracks are generated for the demo; the route is approximate and not for navigation. Related: [[Travel]]",
    ],
  });
}

// Russian campaign
{
  const bs = of("battle").sort((a, b) => String(a.props.date).localeCompare(String(b.props.date)));
  areaNote("notes/3_resources/history/Russian campaign 1812/Russian campaign 1812.md", {
    title: "Napoleon's Russian campaign, 1812", look: "elegant", tags: ["history"],
    dek: "Minard's map, rebuilt from his numbers, with the battles as notes.",
    stats: [["422,000", "crossed the Niemen"], ["100,000", "reached Moscow"], ["10,000", "came back"], ["−38 °C", "on December 6"]],
    intro: `Charles Joseph Minard drew this in 1869: the band is the army, its width the number of men, gold going east and black coming back, with the temperature on the retreat underneath. Edward Tufte called it about the best statistical graphic ever drawn. Here the army and the temperatures come from Minard's own figures (the HistData tables); the battles are notes in this folder, so adding one puts it on the map.`,
    sections: [
      "![[Campaign 1812.base#Minard map]]",
      `## Reading the map\n\n${bullets([
        "Barely one soldier in forty came back. Most were lost to hunger, disease and desertion before the first snow, not in battle.",
        "Most of the loss happens in summer: the main column is down from 340,000 to 145,000 by Smolensk, months before the first frost.",
        `The cold arrives with the retreat. The worst readings, at the Berezina and after, line up with the band thinning to a thread: see [[Battle of the Berezina]].`,
      ])}`,
      `## The battles\n\n![[Campaign 1812.base#Battles]]\n\n${bullets(bs.map((b) => `${b.props.date}: [[${b.name}]], ${String(b.props.outcome).toLowerCase()}`))}`,
      `## To read\n\n${todos([[false, "Adam Zamoyski, *1812: Napoleon's Fatal March on Moscow*"], [false, "Tolstoy's Borodino chapters in [[War and Peace]]"], [true, "Tufte, *The Visual Display of Quantitative Information*"]])}`,
      "Data: Minard (1869) via HistData; battle places and dates approximate.",
    ],
  });
}

// Vault review
{
  const top = new Map();
  for (const n of NOTES) if (n.path.startsWith("notes/")) { const f = n.path.split("/")[1]; if (!f.endsWith(".md")) top.set(f, (top.get(f) ?? 0) + 1); }
  const all = NOTES.filter((n) => n.path.startsWith("notes/")).length;
  const rank = [...top.entries()].sort((a, b) => b[1] - a[1]);
  areaNote("notes/Vault review.md", {
    title: "Vault review", look: "colourful", tags: ["meta"],
    dek: "What this vault is made of, by folder and by size.",
    stats: [[fmt(all), "notes"], [top.size, "top-level folders"], [top.get("0_inbox") ?? 0, "in the inbox"], [of("resource").length, "resources"]],
    intro: `Rings are folders, arc length is bytes, hue follows the angle so a folder's contents share its colour. Click a ring to zoom into a folder, the centre to go back up, a note to open it.`,
    sections: [
      "![[Vault.base#Sunburst]]",
      `## What I noticed\n\n${bullets([
        `\`${rank[0][0]}\` holds ${fmt(rank[0][1])} notes (meetings, plays, people, books); \`${rank[1][0]}\` comes next with ${fmt(rank[1][1])}.`,
        "Meetings are the biggest single folder under areas: small notes, but many of them.",
        `The inbox has ${top.get("0_inbox") ?? 0} notes waiting. Triage on Friday.`,
      ])}`,
      `## Housekeeping\n\n${todos([[false, "Empty the inbox"], [false, "Merge the cooking resources into one note per cuisine"], [true, "Move trip legs into one note per trip"]])}`,
      "## Largest notes\n\n![[Vault.base#Largest files]]",
    ],
  });
}

console.log(`demo-vault: ${meetings} meetings, ${[...playCounts.values()].reduce((a, b) => a + b, 0)} plays, ${days.length} hike days`);
