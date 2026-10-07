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
function note(path, props, body = "") {
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
  ["learning", "Learn Rust", "paused", 3, "2026-01-12", "2026-09-30", []],
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
    `# ${name}\n\n${lorem(20)}`,
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
const legs = [
  ["2024-03-08", "New York", "Mexico City", "Mexico"], ["2024-03-15", "Mexico City", "New York", "Mexico"],
  ["2024-06-20", "New York", "Rome", "Italy and Greece"], ["2024-06-26", "Rome", "Athens", "Italy and Greece"],
  ["2024-07-02", "Athens", "New York", "Italy and Greece"], ["2024-10-11", "New York", "Montreal", "Long weekend"],
  ["2024-10-14", "Montreal", "New York", "Long weekend"], ["2024-12-20", "New York", "Lima", "Peru"],
  ["2024-12-23", "Lima", "Cusco", "Peru"], ["2024-12-30", "Cusco", "Buenos Aires", "Peru"], ["2025-01-05", "Buenos Aires", "New York", "Peru"],
  ["2025-02-10", "New York", "Lisbon", "Winter escape"], ["2025-02-14", "Lisbon", "Porto", "Winter escape"],
  ["2025-02-18", "Porto", "London", "Winter escape"], ["2025-02-22", "London", "New York", "Winter escape"],
  ["2025-05-03", "New York", "San Francisco", "Work"], ["2025-05-07", "San Francisco", "New York", "Work"],
  ["2025-07-12", "New York", "Reykjavik", "Summer"], ["2025-07-16", "Reykjavik", "Berlin", "Summer"],
  ["2025-07-22", "Berlin", "Kyiv", "Summer"], ["2025-08-01", "Kyiv", "Paris", "Summer"], ["2025-08-05", "Paris", "Barcelona", "Summer"],
  ["2025-08-09", "Barcelona", "New York", "Summer"], ["2025-10-09", "New York", "Atlanta", "AT Georgia"],
  ["2025-10-13", "Atlanta", "New York", "AT Georgia"], ["2025-11-14", "New York", "Tokyo", "Japan"],
  ["2025-11-20", "Tokyo", "Kyoto", "Japan"], ["2025-11-26", "Kyoto", "Bangkok", "Japan"], ["2025-12-02", "Bangkok", "New York", "Japan"],
  ["2026-03-14", "New York", "Cape Town", "Spring"], ["2026-03-25", "Cape Town", "Lisbon", "Spring"], ["2026-04-01", "Lisbon", "New York", "Spring"],
];
for (const [date, from, to, trip] of legs) {
  const mode = (from === "Tokyo" && to === "Kyoto") || (from === "Berlin" && to === "Kyiv") || (from === "Lisbon" && to === "Porto") ? "train" : "flight";
  note(`notes/2_areas/travel/trips/${date} ${from} to ${to}.md`, { type: "trip", tags: ["trip"], date, from: link(from), to: link(to), mode, trip });
}

// --- journal -------------------------------------------------------------------------------------
day = new Date("2026-04-01T00:00:00Z");
let mood = 3.2;
while (day <= new Date("2026-09-30T00:00:00Z")) {
  const wd = day.getUTCDay();
  mood = Math.max(1, Math.min(5, mood * 0.7 + 0.3 * (3.2 + (wd === 0 || wd === 6 ? 0.5 : 0) + 0.8 * gauss())));
  const sleep = Math.round(Math.max(4.5, Math.min(9.5, 7 + 0.8 * gauss() + (wd === 6 ? 0.8 : 0))) * 10) / 10;
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

// --- reading -------------------------------------------------------------------------------------
const books = [
  ["Dune", "Frank Herbert", "sci-fi", 5, 412, "1965-08-01", "read", "9780441172719"], ["The Hobbit", "J.R.R. Tolkien", "fantasy", 5, 310, "1937-09-21", "read", "9780547928227"],
  ["Neuromancer", "William Gibson", "sci-fi", 4, 271, "1984-07-01", "read", "9780441569595"], ["Foundation", "Isaac Asimov", "sci-fi", 4, 244, "1951-06-01", "read", "9780553293357"],
  ["A Wizard of Earthsea", "Ursula K. Le Guin", "fantasy", 4, 183, "1968-11-01", "read", "9780547773742"], ["The Left Hand of Darkness", "Ursula K. Le Guin", "sci-fi", 5, 304, "1969-03-01", "reading", "9780441478125"],
  ["Gone Girl", "Gillian Flynn", "thriller", 3, 415, "2012-06-05", "read", "9780307588371"], ["Sapiens", "Yuval Noah Harari", "non-fiction", 4, 443, "2011-01-01", "read", "9780062316097"],
  ["Educated", "Tara Westover", "non-fiction", 5, 334, "2018-02-20", "read", "9780399590504"], ["Thinking, Fast and Slow", "Daniel Kahneman", "non-fiction", 4, 499, "2011-10-25", "abandoned", "9780374533557"],
  ["The Name of the Wind", "Patrick Rothfuss", "fantasy", 4, 662, "2007-03-27", "read", "9780756404741"], ["Piranesi", "Susanna Clarke", "fantasy", 5, 272, "2020-09-15", "read", "9781635575637"],
  ["The Overstory", "Richard Powers", "fiction", null, 502, "2018-04-03", "to-read", null], ["A Walk in the Woods", "Bill Bryson", "non-fiction", 4, 276, "1998-05-04", "read", null],
];
for (const [title, author, genre, rating, pages, published, status, isbn] of books) {
  note(`notes/2_areas/reading/${title}.md`, { type: "book", tags: ["book"], author, genre, rating, pages, published, status, isbn }, `# ${title}\n\n${lorem(20)}`);
}

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
days.forEach(([date, from, to, wps], di) => {
  const rows = ["time,lat,lon,ele_m,hr"];
  let t = new Date(`${date}T${di === 0 ? "09:40" : "08:15"}:00-04:00`).getTime();
  const breaks = new Set();
  let distSoFar = 0;
  const legLengths = wps.slice(1).map((w, i) => hav(wps[i], w));
  const total = legLengths.reduce((a, b) => a + b, 0);
  [0.33, 0.55, 0.8].forEach((f) => breaks.add(Math.round(f * total / 40)));
  let step = 0;
  let prevEle = wps[0][2];
  let hr = 95;
  const phase = rnd() * 10;
  for (let li = 0; li < legLengths.length; li++) {
    const a = wps[li];
    const b = wps[li + 1];
    const n = Math.max(2, Math.round(legLengths[li] / 40));
    for (let k = li === 0 ? 0 : 1; k <= n; k++) {
      const f = k / n;
      const d = distSoFar + f * legLengths[li];
      // Switchbacks and ridge-line wiggle: smooth perpendicular offsets, zero at waypoints.
      const wig = Math.sin(Math.PI * f) * (0.0016 * Math.sin(d / 230 + phase) + 0.0009 * Math.sin(d / 71));
      const lat = a[0] + (b[0] - a[0]) * f - (b[1] - a[1]) * wig * 2;
      const lon = a[1] + (b[1] - a[1]) * f + (b[0] - a[0]) * wig * 2;
      const ele = a[2] + (b[2] - a[2]) * (0.5 - 0.5 * Math.cos(Math.PI * f)) + Math.sin(Math.PI * f) * (28 * Math.sin(d / 410 + phase) + 9 * Math.sin(d / 97));
      const grade = (ele - prevEle) / 40;
      // Tobler's hiking function, slowed by a 12 kg pack and the day's fatigue.
      const kmh = 6 * Math.exp(-3.5 * Math.abs(grade + 0.05)) * (0.78 - 0.05 * (d / total)) * (1 + 0.08 * gauss());
      if (step > 0) t += (40 / 1000 / Math.max(0.8, kmh)) * 3600 * 1000;
      hr = 0.8 * hr + 0.2 * Math.max(88, Math.min(172, 102 + 900 * Math.max(0, grade) + 6 * gauss()));
      rows.push(`${new Date(t).toISOString()},${lat.toFixed(6)},${lon.toFixed(6)},${ele.toFixed(1)},${Math.round(hr)}`);
      if (breaks.has(step)) {
        const minutes = step === Math.round(0.55 * total / 40) ? 35 : 10;
        for (let m = 1; m <= minutes; m += 2) {
          t += 120 * 1000;
          hr = 0.6 * hr + 0.4 * 84;
          rows.push(`${new Date(t).toISOString()},${(lat + 0.00001 * gauss()).toFixed(6)},${(lon + 0.00001 * gauss()).toFixed(6)},${ele.toFixed(1)},${Math.round(hr)}`);
        }
      }
      prevEle = ele;
      step++;
    }
    distSoFar += legLengths[li];
  }
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
    order: [file.name, date, from, to, trip]
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
    order: [file.name, date, from, to, mode, trip]
    sort:
      - property: date
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
formulas:
  cover: if(isbn, "https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg", null)
views:
  - type: agate
    name: Shelf
    order: [file.name, author, genre, rating, pages, published]
    specFile: charts/reading-shelf.vl.json
  - type: table
    name: Table
    order: [file.name, author, genre, rating, pages, status]
`);
base("Vault", `
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

console.log(`demo-vault: ${meetings} meetings, ${[...playCounts.values()].reduce((a, b) => a + b, 0)} plays, ${days.length} hike days`);
