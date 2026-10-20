// Checks the catalog for mistakes the app would hit at runtime: unknown ids, missing icons, bad values.
// Run with `npm run validate`. Exits with an error listing every problem.
import { readdirSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const listIn = (source, name) =>
  [...source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`))[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);

// Allowed values come from the app's own source, so they can't drift apart.
const catalogSource = read('src/data/catalog.ts');
const DURATIONS = new Set(
  [...catalogSource.match(/const DURATION_MINUTES[^{]*\{([^}]*)\}/)[1].matchAll(/'([^']*)':/g)].map((m) => m[1]),
);
const COSTS = new Set(listIn(catalogSource, 'COSTS'));
const LEVELS = new Set(['easy', 'medium', 'stretch']);
const themeSource = read('src/theme.ts');
const KINDS = new Set(
  [...themeSource.slice(themeSource.indexOf('export const SUBCATEGORIES')).matchAll(/^ {2}(\w+): \{ label:/gm)].map((m) => m[1]),
);
const ICON_NAMES = new Set([...read('src/icons/paths.ts').matchAll(/^ {2}(\w+): '/gm)].map((m) => m[1]));
const PLACE_ID = /^(osm:[nwr]\d+|pick:[a-z0-9]+(-[a-z0-9]+)*)$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Ski hills can be a couple of hours out, but a mistyped coordinate lands much farther away.
const MAX_KM = 300;

const errors = [];
const fail = (where, problem) => errors.push(`${where}: ${problem}`);

const icons = json('design/icon-mapping.json');
const activities = json('data/activities.json').activities;
const activityIds = new Set();

const checkMonths = (where, months) => {
  if (!Array.isArray(months) || !months.length || months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
    fail(where, `months must be 1 to 12, got ${JSON.stringify(months)}`);
  }
};
const checkIcon = (id) => {
  const material = icons[id]?.material;
  if (!material) fail(id, 'no entry in design/icon-mapping.json');
  else if (!ICON_NAMES.has(material)) fail(id, `icon "${material}" is missing from src/icons/paths.ts (run npm run icons)`);
};

for (const a of activities) {
  const where = `activity ${a.id}`;
  if (!ID.test(a.id ?? '')) fail(where, 'id must be lowercase words joined by hyphens');
  if (activityIds.has(a.id)) fail(where, 'duplicate id');
  activityIds.add(a.id);
  if (!a.name?.trim()) fail(where, 'missing name');
  if (!KINDS.has(a.subcategory)) fail(where, `unknown kind "${a.subcategory}"`);
  if (!DURATIONS.has(a.duration)) fail(where, `unknown duration "${a.duration}"`);
  if (!COSTS.has(a.cost)) fail(where, `unknown cost "${a.cost}"`);
  if (!LEVELS.has(a.level)) fail(where, `unknown level "${a.level}"`);
  if (a.months) checkMonths(where, a.months);
  if (a.months && a.warm) fail(where, 'has both months and warm; pick one');
  for (const way of ['home', 'host', 'search']) {
    if (way in a && !a[way]?.trim()) fail(where, `empty ${way}`);
  }
  checkIcon(a.id);
}

const km = (a, b) => {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(x, (b.lat - a.lat) * rad) * 6371;
};

const placeIds = new Map();
const iconIds = new Set();
for (const file of readdirSync('data/cities').filter((f) => f.endsWith('.json'))) {
  const city = json(`data/cities/${file}`);
  const cityPlaces = new Set();
  if (city.warmMonths) checkMonths(`city ${city.id}`, city.warmMonths);
  for (const p of city.places) {
    const where = `${city.id} place ${p.id} (${p.name})`;
    if (!PLACE_ID.test(p.id)) fail(where, 'id must be osm:<type><number> or pick:<name>');
    if (placeIds.has(p.id)) fail(where, `id also used in ${placeIds.get(p.id)}`);
    placeIds.set(p.id, city.id);
    cityPlaces.add(p.id);
    if (!p.name?.trim()) fail(where, 'missing name');
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') fail(where, 'missing coordinates');
    else if (km(city, p) > MAX_KM) fail(where, `${Math.round(km(city, p))} km from ${city.name}`);
    if (!p.activities?.length) fail(where, 'no activities');
    for (const id of p.activities ?? []) if (!activityIds.has(id)) fail(where, `unknown activity "${id}"`);
    if (p.duration && !DURATIONS.has(p.duration)) fail(where, `unknown duration "${p.duration}"`);
    if (p.cost && !COSTS.has(p.cost)) fail(where, `unknown cost "${p.cost}"`);
  }
  for (const i of city.icons) {
    const where = `${city.id} icon ${i.id}`;
    if (iconIds.has(i.id) || activityIds.has(i.id)) fail(where, 'id already used by another icon or an activity');
    iconIds.add(i.id);
    if (!cityPlaces.has(i.place)) fail(where, `place "${i.place}" isn't in this city`);
    if (!activityIds.has(i.activity)) fail(where, `unknown activity "${i.activity}"`);
    if (!KINDS.has(i.subcategory)) fail(where, `unknown kind "${i.subcategory}"`);
    if (!DURATIONS.has(i.duration)) fail(where, `unknown duration "${i.duration}"`);
    if (!COSTS.has(i.cost)) fail(where, `unknown cost "${i.cost}"`);
    if (i.level && !LEVELS.has(i.level)) fail(where, `unknown level "${i.level}"`);
    checkIcon(i.id);
  }
}

const aliases = json('data/aliases.json').aliases;
for (const [from, to] of Object.entries(aliases)) {
  const where = `alias ${from}`;
  if (activityIds.has(from) || placeIds.has(from)) fail(where, 'old id is still in use, so history would move away from it');
  const seen = new Set([from]);
  let end = to;
  while (aliases[end] && !seen.has(end)) {
    seen.add(end);
    end = aliases[end];
  }
  if (seen.has(end)) fail(where, 'aliases loop back on themselves');
  else if (!activityIds.has(end) && !placeIds.has(end)) fail(where, `points at "${end}", which doesn't exist`);
}

if (errors.length) {
  console.error(`${errors.length} catalog ${errors.length === 1 ? 'problem' : 'problems'}:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`Catalog OK: ${activities.length} activities, ${placeIds.size} places, ${iconIds.size} city icons, ${Object.keys(aliases).length} aliases`);
