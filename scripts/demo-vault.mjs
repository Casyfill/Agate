// Run: node scripts/demo-vault.mjs
// Writes the notes, data files and bases of demo-vault/ from a fixed seed, so screenshots and
// tests are stable. Hand-written parts (demo-vault/charts, Start here, Dashboard) are left alone.
// Everything here is invented; the hike follows the Appalachian Trail in Georgia only roughly
// and must not be used for navigation.
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync, readFileSync, readdirSync } from "fs";
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
// Each game's picture: the lead image of its English Wikipedia article (mostly the box; for a few a
// photo of the game in play), hotlinked from Wikimedia like the test vault's book covers. Fetched once
// (2026-10-14) into scripts/data/boardgame-images.json; four games have no usable image. Box art © its publishers.
const BOX = JSON.parse(readFileSync(new URL("./data/boardgame-images.json", import.meta.url), "utf8"));
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
      image: BOX[name],
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

// --- interview prep: real practice attempts, scrubbed ---------------------------------------------------
// scripts/data/interview-attempts.json holds the properties of 75 real practice attempts and a
// one-line question each, extracted once (2026-10-14) from a private vault. Answers, coaching notes
// and anything naming an employer, product or real project were left out; behavioral and
// project-deep-dive questions are reduced to a generic label.
const ATTEMPTS = JSON.parse(readFileSync(new URL("./data/interview-attempts.json", import.meta.url), "utf8"));
const PREP = "notes/1_projects/Interview prep";
const trackOf = (domain) => (domain.includes("Coding") ? "Coding & Algorithms" : domain);
for (const a of ATTEMPTS) {
  const { name, question, ...props } = a;
  note(`${PREP}/attempts/${name}.md`, { type: "interview-attempt", tags: ["career/interview"], ...props },
    `# ${props.question_id}\n\n${question}\n\nGrades: cold ${props.initial}${props.readup ? `, after read-up ${props.readup}` : ""}${props.final ? `, re-test ${props.final}` : ""}. Prep: [[${trackOf(props.domain).replace(/ \/ /g, " - ")}]].`);
}
for (const track of [...new Set(ATTEMPTS.map((a) => trackOf(a.domain)))].sort()) {
  const mine = ATTEMPTS.filter((a) => trackOf(a.domain) === track).sort((x, y) => String(x.date).localeCompare(String(y.date)));
  note(`${PREP}/prep/${track.replace(/ \/ /g, " - ")}.md`, { type: "interview-prep", tags: ["career/interview"], domain: track },
    `# ${track}\n\n${mine.length} attempts. Part of [[Interview prep]].\n\n${mine.map((a) => `- [[${a.name}]]: ${a.question} (cold ${a.initial}${a.final ? ` → ${a.final}` : ""})`).join("\n")}`);
}

// --- the hike: three days on the Appalachian Trail in Georgia ------------------------------------
// Landmarks along the way (rounded coordinates); each day ends at the trail point nearest its last one.
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
// Hourly weather, 2025-10-10T00Z to 2025-10-12T23Z at 34.69 N, 84.08 W (grid cell 760 m): real
// temperature and cloud cover from the Open-Meteo archive (ERA5). It did not rain; the day-2
// shower below is invented so the rain panel has something to show.
const WX_TEMP = [13.8,13.9,14.3,13.7,12.4,11.7,10.6,10.2,9.8,9.4,8.9,8.5,8.3,10.2,12.3,13.9,15.6,16.7,18.3,18.6,18.6,18.0,16.7,14.2,12.4,12.2,11.0,10.4,10.0,9.7,8.9,8.9,8.8,8.5,8.0,7.3,7.5,11.8,14.5,16.2,17.8,18.7,20.3,20.5,20.6,20.4,19.5,16.3,14.4,13.5,12.4,12.0,12.0,12.0,10.7,10.5,10.1,9.3,9.1,8.9,8.2,11.8,14.5,17.0,19.2,20.6,22.3,22.3,22.3,21.6,19.7,16.8];
const WX_CLOUD = [23,100,100,74,3,0,0,0,4,9,1,3,4,0,1,2,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,7,9,8,38,99,100,88,100,100,100,100,100,100,100,100,100,100,100,100,26,9,1,0,0,0,0,0,0,0,2,0];
const WX_RAIN = { 41: 0.6, 42: 2.4, 43: 0.4 }; // hour index → mm/h: day 2, 1–4 pm EDT
const WX_SHOWER = { 41: [85, -0.8], 42: [95, -2.4], 43: [70, -1.2] }; // cloud %, temperature change
const WX_T0 = Date.parse("2025-10-10T00:00:00Z");
/** Weather at time `t` and elevation `ele` (m): hourly values interpolated, temperature lapsed 6.5 °C/km from the grid cell. */
function weatherAt(t, ele) {
  const h = (t - WX_T0) / 3600000, i = Math.floor(h), f = h - i;
  const at = (k) => [WX_TEMP[k] + (WX_SHOWER[k]?.[1] ?? 0), WX_SHOWER[k]?.[0] ?? WX_CLOUD[k]];
  const [a0, c0] = at(i), [a1, c1] = at(i + 1);
  return { temp: a0 + (a1 - a0) * f - (6.5 * (ele - 760)) / 1000, cloud: c0 + (c1 - c0) * f, rain: WX_RAIN[i] ?? 0 };
}
const wxCols = (t, ele) => {
  const w = weatherAt(t, ele);
  return `${w.temp.toFixed(1)},${Math.round(w.cloud)},${w.rain.toFixed(1)}`;
};
// The real trail: Appalachian Trail ways of OSM route relation 2007643 (© OpenStreetMap
// contributors, ODbL), stitched Springer Mountain → Neel Gap, resampled every 40 m, heights from
// the Copernicus 90 m DEM via Open-Meteo's elevation API. Fetched once (2026-10-13) into
// scripts/data/at-georgia.json as [lat, lon, ele_m]; the times and heart rate below are invented.
const TRAIL = JSON.parse(readFileSync(new URL("./data/at-georgia.json", import.meta.url), "utf8"));
const smooth = (xs, k) => xs.map((_, i) => {
  const w = xs.slice(Math.max(0, i - k), i + k + 1);
  return w.reduce((a, b) => a + b, 0) / w.length;
});
const trailEle = smooth(TRAIL.map((p) => p[2]), 3); // the DEM is noisy at 40 m spacing
const nearestOnTrail = (p) => TRAIL.reduce((best, q, i) => (hav(p, q) < hav(p, TRAIL[best]) ? i : best), 0);
const dayEnds = [0, ...days.map(([, , , wps]) => nearestOnTrail(wps[wps.length - 1]))];
dayEnds[3] = TRAIL.length - 1;
const DAY_START = ["09:40", "07:50", "07:30"]; // local (EDT) start of each day
/** One day's GPS points along the real trail: Tobler's pace on the smoothed grade, three breaks, a lagging heart rate. */
function buildDay(di) {
  const pts = TRAIL.slice(dayEnds[di], dayEnds[di + 1] + 1).map((p, i) => [p[0], p[1], trailEle[dayEnds[di] + i]]);
  const along = [0];
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + hav(pts[i - 1], pts[i]));
  const length = along[along.length - 1];
  const grade = smooth(pts.map((p, i) => {
    const a = Math.max(0, i - 2), b = Math.min(pts.length - 1, i + 2);
    return along[b] > along[a] ? (pts[b][2] - pts[a][2]) / (along[b] - along[a]) : 0;
  }), 2);
  const effort = smooth(grade, 8); // heart rate follows the climb over ~300 m, not every DEM bump
  const breakAt = new Map([[0.28, 15], [0.52, 45], [0.78, 20]].map(([f, min]) => [Math.round(f * (pts.length - 1)), min]));
  const rows = ["time,lat,lon,ele_m,hr,temp_c,cloud_pct,precip_mm"];
  let t = new Date(`${days[di][0]}T${DAY_START[di]}:00-04:00`).getTime();
  let hr = 92;
  const phase = di * 2.1;
  const push = (p) => rows.push(`${new Date(t).toISOString()},${p[0].toFixed(6)},${p[1].toFixed(6)},${p[2].toFixed(1)},${Math.round(hr)},${wxCols(t, p[2])}`);
  pts.forEach((p, i) => {
    if (i > 0) {
      // Tobler's hiking function, slowed to a loaded AT pace (~2 mph on the flat) and the day's fatigue, with a slow drift.
      const kmh = 6 * Math.exp(-3.5 * Math.abs(grade[i] + 0.05)) * (0.6 - 0.06 * (along[i] / length)) * (1 + 0.05 * Math.sin(along[i] / 900 + phase));
      t += ((along[i] - along[i - 1]) / 1000 / kmh) * 3600 * 1000;
      const target = Math.max(92, Math.min(162, 104 + 750 * Math.max(0, effort[i]) + 120 * Math.max(0, -effort[i] - 0.15)));
      hr += (target - hr) * 0.1;
    }
    push(p);
    const minutes = breakAt.get(i) ?? 0;
    for (let m = 2; m <= minutes; m += 2) {
      t += 120 * 1000;
      hr += (80 - hr) * 0.35;
      push(p);
    }
  });
  // The watch keeps logging overnight at camp, every 15 minutes, until the next morning's start:
  // speed zero, heart rate settling towards a sleeping rate, weather from the hourly record.
  if (di < days.length - 1) {
    const camp = pts[pts.length - 1];
    const arrive = t;
    const leave = new Date(`${days[di + 1][0]}T${DAY_START[di + 1]}:00-04:00`).getTime();
    for (t = arrive + 15 * 60000; t < leave; t += 15 * 60000) {
      const h = (t - arrive) / 3600000;
      hr = 53 + 24 * Math.exp(-h / 1.4) + 2 * Math.sin(h / 3 + di) + (h > 10 ? 3 * (h - 10) : 0); // settles, then wakes
      push(camp);
    }
  }
  return { rows, length, top: Math.max(...pts.map((p) => p[2])) };
}
let hikeMiles = 0, hikeTop = 0;
const dayMiles = [];
days.forEach(([date, from, to, wps], di) => {
  const { rows, length, top } = buildDay(di);
  hikeMiles += length / 1609.34;
  hikeTop = Math.max(hikeTop, top);
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
      weather: ["clear and cool", "sunny, a shower after lunch", "low cloud until mid-morning, then warm sun"][di],
    },
    `Waypoints: ${wps.map((w) => w[3]).filter(Boolean).join(" → ")}. The route is the real trail (OpenStreetMap); times and heart rate are invented. The watch kept logging overnight at camp.`,
  );
});
note(
  "notes/2_areas/hiking/AT Georgia 2025/AT Georgia 2025.md",
  { type: "hike", tags: ["hike"], start: "2025-10-10", end: "2025-10-12", trail: "Appalachian Trail", section: "Springer Mountain to Neel Gap" },
  `# AT Georgia 2025\n\nThree days from Springer Mountain to Neel Gap over Blood Mountain. ${hikeNotes.map(link).join(", ")}.\n\nThe GPS tracks in attachments/hikes are generated for the demo: the route and heights are the real trail (© OpenStreetMap contributors; Copernicus DEM), the times and the heart rate are invented. Temperature and cloud cover are the real hourly values for those days (Open-Meteo archive, adjusted for elevation); the day-2 shower is invented. Not for navigation.`,
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
const world = new URL("../demo-vault/tests/geo/world-110m.json", import.meta.url).pathname;
mkdirSync(join(ROOT, "attachments/geo"), { recursive: true });
if (existsSync(world)) copyFileSync(world, join(ROOT, "attachments/geo/world-110m.json"));
// Hand-made map files live in tests/geo (this folder is rebuilt); see tests/geo/README.md.
for (const f of ["brooklyn-holc.geojson", "nyc-boroughs.geojson"]) {
  copyFileSync(new URL(`../demo-vault/tests/geo/${f}`, import.meta.url).pathname, join(ROOT, `attachments/geo/${f}`));
}

// The whole Gapminder table, for specs that read one CSV (charts/gapminder-bubble.vl.json).
mkdirSync(join(ROOT, "attachments/dataviz"), { recursive: true });
copyFileSync(new URL("../demo-vault/tests/data/gapminder.csv", import.meta.url).pathname, join(ROOT, "attachments/dataviz/gapminder.csv"));

// --- Gapminder: one note and one CSV per country, from tests/data/gapminder.csv ------------------
{
  const text = readFileSync(new URL("../demo-vault/tests/data/gapminder.csv", import.meta.url).pathname, "utf8");
  // Country names can hold commas ("Korea, Dem. Rep."), so split on commas outside quotes.
  const cells = (line) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')).slice(0, 6);
  const byCountry = new Map();
  for (const line of text.trim().split("\n").slice(1)) {
    const [country, year, pop, continent, lifeExp, gdpPercap] = cells(line);
    if (!byCountry.has(country)) byCountry.set(country, { continent, rows: [] });
    byCountry.get(country).rows.push([year, pop, lifeExp, gdpPercap].join(","));
  }
  for (const [country, { continent, rows }] of byCountry) {
    const csv = `attachments/gapminder/${country}.csv`;
    write(csv, `year,pop,lifeExp,gdpPercap\n${rows.join("\n")}\n`);
    note(`notes/3_resources/gapminder/${country}.md`, { type: "country", tags: ["dataviz/gapminder"], continent, data: csv }, `# ${country}\n\nGapminder figures for ${country}, 1952–2007, in [[${csv}]].`);
  }
}

// --- hand-written notes, copied as they are (scripts/data/notes mirrors notes/) -----------------
{
  const src = new URL("./data/notes/", import.meta.url).pathname;
  const copyTree = (rel) => {
    for (const e of readdirSync(join(src, rel), { withFileTypes: true })) {
      const r = join(rel, e.name);
      if (e.isDirectory()) copyTree(r);
      else write(join("notes", r), readFileSync(join(src, r), "utf8"));
    }
  };
  copyTree("");
}

// --- Obsidian config: Bases on, Agate enabled, property types declared -----------------------------
// Obsidian rewrites these as you use the vault (theme, plugins), so they are only seeded when
// missing; types.json is generated (it must match the notes) and always written.
const obs = (name, value) => {
  if (name !== "types.json" && existsSync(join(ROOT, ".obsidian", name))) return;
  write(`.obsidian/${name}`, JSON.stringify(value, null, 2) + "\n");
};
obs("community-plugins.json", ["agate", "side-notes", "tufte-suite", "obsidian-minimal-settings"]);
obs("core-plugins.json", {
  "file-explorer": true, "global-search": true, switcher: true, graph: true, backlink: true, canvas: true,
  "outgoing-link": true, "tag-pane": true, properties: true, "page-preview": true, "command-palette": true,
  outline: true, "word-count": true, "file-recovery": true, bases: true,
});
obs("app.json", { attachmentFolderPath: "attachments", newFileLocation: "folder", newFileFolderPath: "notes/0_inbox" });
obs("appearance.json", { theme: "obsidian", cssTheme: "Tufte", enabledCssSnippets: ["agate-demo"] });
const typeOf = (t, keys) => Object.fromEntries(keys.map((k) => [k, t]));
obs("types.json", {
  types: {
    ...typeOf("date", ["date", "start", "due", "end", "published", "created"]),
    ...typeOf("number", ["initial", "readup", "final", "lc", "priority", "duration", "players_min", "players", "time", "complexity", "price", "played_times", "lat", "lon", "mood", "energy", "sleep", "rating", "pages", "day"]),
    ...typeOf("multitext", ["tags", "people", "attendees", "habits", "participants"]),
    ...typeOf("checkbox", ["kids", "owned", "coding", "retest"]),
    ...typeOf("text", ["type", "area", "status", "kind", "theme", "winner", "trip", "mode", "country", "country_id", "author", "genre", "isbn", "role", "team", "from", "to", "project", "game", "hike", "track", "weather", "image", "domain", "question_id", "topic", "level", "problem"]),
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
base("Interview prep", `
filters:
  and:
    - type == "interview-attempt"
views:
  - type: agate
    name: Cold score
    order: [file.name, date, domain, topic, initial, readup, final]
    specFile: charts/interview-cold-score.vl.json
  - type: agate
    name: By domain
    order: [file.name, date, domain, question_id, initial, final]
    specFile: charts/interview-domains.vl.json
  - type: table
    name: Attempts
    order: [file.name, date, domain, topic, level, initial, readup, final]
    sort:
      - property: date
        direction: DESC
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
    theme: instrument
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
  - type: agate
    name: Genres
    order: [file.name, genre, status]
    specFile: charts/bars-genre.vl.json
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
  - type: agate
    name: Links
    filters:
      or:
        - type == "meeting"
        - type == "person"
        - type == "project"
        - type == "play"
        - type == "boardgame"
        - type == "trip"
        - type == "place"
    order: [file.name, type]
    specFile: charts/vault-links.vg.json
  - type: table
    name: Largest files
    order: [file.name, file.folder, file.size]
    sort:
      - property: file.size
        direction: DESC
`);
base("Gapminder", `
filters:
  and:
    - type == "country"
views:
  - type: agate
    name: Wealth and health
    order: [file.name, continent]
    specFile: charts/gapminder.vl.json
  - type: table
    name: Countries
    order: [file.name, continent, data]
    groupBy:
      property: continent
      direction: ASC
`);

// --- area notes: one per area, written like notes someone keeps, with numbers from the data ----------
// look: which of the three screenshot looks the note is shot in (docs/demo-story.md).
const of = (type) => NOTES.filter((n) => n.props.type === type);
const unlink = (v) => String(v).replace(/^\[\[|\]\]$/g, "");
const fmt = (n) => n.toLocaleString("en-US");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const TODAY = new Date("2026-10-07T00:00:00Z");
function areaNote(path, { title, look, tags = [], dek, stats, statsSpec, intro, sections }) {
  // statsSpec: live numbers from a spec over the base (Agate's experimental stats output); otherwise a static [!stats] row.
  const stat = statsSpec
    ? `\`\`\`agate\nspec: ${statsSpec.spec}\nbase: ${statsSpec.base}\n\`\`\``
    : `> [!stats]\n${stats.map(([v, l]) => `> - **${v}** ${l}`).join("\n")}`;
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
      "Related: [[AT Georgia 2025]] · [[Interview prep]]",
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
      "Hover a bubble for the game's picture (its `image` property): lead images of the games' Wikipedia articles, box art © its publishers.",
    ],
  });
}

// Interview prep
{
  const at = of("interview-attempt");
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const pid = (q) => String(q).replace(/(R\d?|-QS)$/, "");
  const problems = new Set(at.map((a) => pid(a.props.question_id)));
  const byTrack = new Map();
  for (const a of at) {
    const t = trackOf(a.props.domain);
    byTrack.set(t, [...(byTrack.get(t) ?? []), a.props.initial]);
  }
  const ranked = [...byTrack].filter(([, v]) => v.length >= 3).map(([t, v]) => [t, mean(v), v.length]).sort((x, y) => y[1] - x[1]);
  const dated = [...at].sort((x, y) => String(x.props.date).localeCompare(String(y.props.date)));
  const firstMonth = dated.filter((a) => a.props.date < "2026-08-23").map((a) => a.props.initial);
  const lastMonth = dated.filter((a) => a.props.date >= "2026-09-13").map((a) => a.props.initial);
  const retests = at.filter((a) => /R\d?$/.test(a.props.question_id));
  const lifted = at.filter((a) => a.props.final && a.props.final > a.props.initial);
  const fmt = (x) => x.toFixed(1);
  areaNote(`${PREP}/Interview prep.md`, {
    title: "Interview prep", look: "dark", tags: ["career"],
    dek: `${Math.round((new Date(dated.at(-1).props.date) - new Date(dated[0].props.date)) / 6048e5)} weeks of practice questions, graded cold, after reading up, and cold again days later.`,
    statsSpec: { spec: "charts/interview-stats.vl.json", base: "bases/Interview prep.base" },
    // A Side-Notes margin note (HTML format, its default): beside the chart in Reading and Editing view.
    intro: `<span class="sidenote margin-note">Each attempt is a note: the question, its domain and topic, and three grades from 1 to 5: cold (the first answer, no notes), after read-up, and a cold re-test days later. The dots are cold grades, the grey line a 7-attempt rolling mean; a ring is a re-test.</span>`,
    sections: [
      "![[Interview prep.base#Cold score]]",
      `## What I noticed\n\n${bullets([
        `Strongest cold: ${ranked[0][0]} (${fmt(ranked[0][1])} over ${ranked[0][2]} attempts). Weakest: ${ranked.at(-1)[0]} (${fmt(ranked.at(-1)[1])}).`,
        `The cold grade moved from ${fmt(mean(firstMonth))} in the first month to ${fmt(mean(lastMonth))} in the last.`,
        `${lifted.length} of ${at.length} attempts scored higher on the re-test than cold.`,
      ])}`,
      "## By domain\n\n![[Interview prep.base#By domain]]",
      `## Next\n\n${todos([[false, "Re-test the two weakest topics cold"], [false, "One system-design mock a week"], [true, "Blocked pass through arrays, hashing and two pointers"]])}`,
      "Prep notes: " + [...byTrack.keys()].sort().map((t) => `[[${t.replace(/ \/ /g, " - ")}]]`).join(" · "),
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
      "Related: [[Interview prep]]",
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
    statsSpec: { spec: "charts/hike-stats.vl.json", base: "bases/Hiking.base" },
    intro: `The first 30 miles of the Appalachian Trail, from the southern terminus to the outfitter at Neel Gap. Each day is a note with its GPS track. Every dot is one reading from the watch, which kept logging overnight at camp. Hover the route or any panel to read elevation, speed, heart rate, the sun's height and the temperature at that moment; drag across the elevation panel to zoom into a stretch of time.`,
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
    intro: `Charles Joseph Minard drew this map [[#^fig-1|(Fig. 1)]] in 1869: the band is the army, its width the number of men, gold going east and black coming back, with the temperature on the retreat underneath. Edward Tufte called it about the best statistical graphic ever drawn. Here the army and the temperatures come from Minard's own figures (the HistData tables); the battles are notes in this folder, so adding one puts it on the map.`,
    sections: [
      // A Tufte Suite figure: the base view is the figure at text width; the caption and the notes on
      // reading it sit beside it in the margin (Reading view). Notes go in the caption, not in separate
      // [!marginnote] callouts: those float beside the text that follows them, not beside the figure.
      [
        "> [!figure] Fig. 1.",
        "> ![[Campaign 1812.base#Minard map]]",
        "> *Carte figurative des pertes successives en hommes de l'Armée Française dans la campagne de Russie, 1812–1813*, after Charles Joseph Minard (1869). Gold, the army marching east from the Niemen; black, the retreat; the line below, the temperature on the way back. Hover a battle for its note's properties, click it to open the note.",
        ">",
        "> Minard's scale was one millimetre of band for every 10,000 men. Here the band is fitted to the page, so it keeps his proportions rather than his millimetres.",
        ">",
        "> He gave the temperatures in degrees Réaumur: −30 °R on 6 December, about −38 °C (1 °R = 1.25 °C).",
        "",
        "^fig-1",
      ].join("\n"),
      `## Reading the map\n\n${bullets([
        "The thin branch to the north is the corps left to hold Polotsk; it rejoins what is left of the main army at the Berezina.",
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
      "## How notes link\n\nEvery note that links or is linked sits on the circle, grouped by folder; each link is bundled through the folder tree. Hover a note to light up its links.\n\n![[Vault.base#Links]]",
      "## Largest notes\n\n![[Vault.base#Largest files]]",
    ],
  });
}

console.log(`demo-vault: ${meetings} meetings, ${[...playCounts.values()].reduce((a, b) => a + b, 0)} plays, ${days.length} hike days`);
