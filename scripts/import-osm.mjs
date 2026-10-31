// Adds OpenStreetMap places to a city file, matched to activities by their tags and names.
// Usage: node scripts/import-osm.mjs <city> [south,west,north,east] [saved-overpass.json]
// Without a box, it takes 40 km around the city's center, the same as the Overture import. Pass "-" as the box to use that
// default with a saved Overpass response. The "Import OpenStreetMap places" GitHub Action runs this where Overpass is reachable.
// Re-running replaces the earlier OSM places; hand-picked places keep their ids and gain matched activities.
// Each place also keeps OSM's wheelchair access ("yes", "limited" or "no") and opening hours, when they're mapped.
import { readFileSync, writeFileSync } from 'node:fs';

const [cityId, bboxArg, saved] = process.argv.slice(2);
if (!cityId) throw new Error('Usage: node scripts/import-osm.mjs <city> [south,west,north,east] [saved.json]');
const file = `data/cities/${cityId}.json`;
const city = JSON.parse(readFileSync(file, 'utf8'));
const RADIUS_KM = 40;
const bbox =
  bboxArg && bboxArg !== '-'
    ? bboxArg
    : (() => {
        const dLat = RADIUS_KM / 111.32;
        const dLng = RADIUS_KM / (111.32 * Math.cos((city.lat * Math.PI) / 180));
        const r = (n) => Math.round(n * 100) / 100;
        return [r(city.lat - dLat), r(city.lng - dLng), r(city.lat + dLat), r(city.lng + dLng)].join(',');
      })();
console.log(`Asking Overpass for ${cityId} in ${bbox}`);

// Cuisines most people haven't tried yet. Common ones like Italian or Mexican don't count as new.
const CUISINES =
  'afghan|brazilian|burmese|caribbean|colombian|cuban|eritrean|ethiopian|filipino|georgian|haitian|indonesian|jamaican|' +
  'korean|lebanese|malaysian|moroccan|nepalese|nigerian|persian|peruvian|senegalese|somali|sri_lankan|taiwanese|turkish|' +
  'ukrainian|uzbek|venezuelan|vietnamese|west_african';
const NEW_CUISINE = new RegExp(`\\b(${CUISINES})\\b`);
// A city's own cuisine isn't new there: Seoul has thousands of Korean restaurants.
const LOCAL_CUISINE = { KR: 'korean' };

const QUERY = `[out:json][timeout:240];
(
 nwr["leisure"~"^(bowling_alley|escape_game|golf_course|ice_rink|horse_riding|fishing|nature_reserve|stadium|dance|park|garden|water_park|sports_centre|fitness_centre|swimming_pool|pitch|miniature_golf|trampoline_park|amusement_arcade|disc_golf_course|sauna|bird_hide)$"]["name"](BBOX);
 nwr["tourism"~"^(museum|gallery|zoo|aquarium|theme_park|attraction|viewpoint)$"]["name"](BBOX);
 nwr["amenity"~"^(theatre|cinema|marketplace|arts_centre|planetarium|music_venue|library|public_bath)$"]["name"](BBOX);
 nwr["amenity"~"^(cafe|bar|pub)$"]["name"~"[Gg]ame"](BBOX);
 nwr["craft"~"^(brewery|winery|distillery)$"]["name"](BBOX);
 nwr["shop"="farm"]["name"](BBOX);
 nwr["landuse"="orchard"]["name"](BBOX);
 nwr["attraction"="maze"]["name"](BBOX);
 nwr["shop"~"^(books|fabric|wool|yarn|craft|sewing)$"]["name"](BBOX);
 nwr["amenity"="restaurant"]["cuisine"~"${CUISINES}"]["name"](BBOX);
 nwr["craft"="pottery"]["name"](BBOX);
 nwr["man_made"="observatory"]["name"](BBOX);
 nwr["sport"~"climbing|fencing|archery|martial_arts|karate|taekwondo|judo|yoga|pilates|roller_skating|pickleball|tennis|canoe|kayak|karting|disc_golf"]["name"](BBOX);
 relation["route"="bicycle"]["name"](BBOX);
);
out center tags;`.replaceAll('BBOX', bbox);

async function fetchElements() {
  if (saved) return JSON.parse(readFileSync(saved, 'utf8')).elements;
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    // Overpass rejects requests without a user agent.
    headers: { 'User-Agent': 'TrySomethingNew/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  return (await response.json()).elements;
}

function activitiesFor(t, country) {
  const name = (t.name ?? '').toLowerCase();
  const sport = t.sport ?? '';
  const { leisure = '', tourism = '', amenity = '', shop = '' } = t;
  const a = new Set();
  const add = (cond, id) => cond && a.add(id);
  add(leisure === 'bowling_alley' || sport.includes('10pin'), 'bowling');
  add(leisure === 'escape_game' || name.includes('escape'), 'escape-room');
  add(leisure === 'golf_course' && !name.includes('mini'), 'golf');
  add(leisure === 'miniature_golf' || (leisure === 'golf_course' && name.includes('mini')), 'mini-golf');
  add(sport.includes('karting'), 'go-karts');
  add(leisure === 'trampoline_park' || /trampoline|sky zone|urban air/.test(name), 'trampoline-park');
  add(leisure === 'amusement_arcade' && !name.includes('chuck e'), 'arcade');
  add(leisure === 'disc_golf_course' || sport.includes('disc_golf'), 'disc-golf');
  add(leisure === 'sauna' || amenity === 'public_bath' || /bathhouse|banya/.test(name), 'sauna');
  add(leisure === 'bird_hide' || (leisure === 'nature_reserve' && /audubon|bird|wetland/.test(name)), 'birdwatching');
  // Zoos tag each exhibit as a viewpoint.
  add(tourism === 'viewpoint' && /lookout|overlook|vista|observation|scenic|summit|deck|platform/.test(name), 'sunrise');
  add(amenity === 'music_venue', 'live-music');
  // University, law, and school libraries aren't open to everyone.
  const library = `${name} ${t.operator ?? ''}`.toLowerCase();
  add(
    amenity === 'library' && /public|metropolitan|county librar|branch|libraries/.test(library) && !/universit|college|school|law/.test(library),
    'library',
  );
  add(['cafe', 'bar', 'pub'].includes(amenity) && /board ?game|tabletop|game (cafe|café|lounge|tavern|pub)/.test(name), 'board-game-cafe');
  add(['brewery', 'winery', 'distillery'].includes(t.craft), 'brewery-tasting');
  const farm = shop === 'farm' || t.landuse === 'orchard';
  add(farm && /orchard|apple|u-pick|pick your own/.test(name), 'apple-picking');
  add(t.attraction === 'maze' || (farm && /pumpkin|maze/.test(name)), 'corn-maze');
  add(leisure === 'ice_rink' || sport.includes('ice_skating'), 'ice-skating');
  add(leisure === 'horse_riding' || sport.includes('equestrian'), 'horseback-riding');
  add(leisure === 'fishing', 'fishing');
  const hike = leisure === 'nature_reserve' || (leisure === 'park' && /metro park|preserve|nature|woods|ravine|trail|둘레길|숲길|자연공원/.test(name));
  add(hike, 'hike-a-trail');
  add(leisure === 'stadium' || (tourism === 'attraction' && name.includes('stadium')), 'sports-game');
  add(leisure === 'dance' || sport.includes('dance'), 'dance-class');
  add(leisure === 'park' && !hike && (t.wikidata || t.website), 'city-park');
  add(leisure === 'garden' && (t['garden:type'] === 'botanical' || /botanical|conservatory/.test(name)), 'botanical-garden');
  const publicPool = ['sports_centre', 'swimming_pool'].includes(leisure) && !['private', 'customers'].includes(t.access);
  add(publicPool && sport.includes('swimming'), 'lap-swimming');
  add(sport.includes('climbing') && leisure !== 'pitch', 'rock-climbing');
  add(sport.includes('fencing'), 'fencing');
  add(sport.includes('archery'), 'archery');
  add(/martial_arts|karate|taekwondo|judo/.test(sport), 'martial-arts');
  add(sport.includes('yoga') || name.includes('yoga'), 'yoga-class');
  add(sport.includes('pilates') || name.includes('pilates'), 'pilates');
  add(sport.includes('roller_skating') || (name.includes('skate') && name.includes('roller')), 'roller-skating');
  add(sport.includes('pickleball'), 'pickleball');
  add(sport.includes('tennis') && ['sports_centre', 'club'].includes(leisure), 'tennis');
  add(/canoe|kayak/.test(sport), 'kayaking');
  if (['museum', 'gallery'].includes(tourism) || amenity === 'planetarium') {
    a.add(tourism === 'gallery' || /\bart/.test(name) ? 'art-museum' : 'science-history-museum');
  }
  add(['zoo', 'aquarium'].includes(tourism), 'zoo-aquarium');
  add(tourism === 'theme_park', 'roller-coaster');
  if (amenity === 'theatre') a.add(/comedy|funny/.test(name) ? 'stand-up-comedy' : 'live-show');
  add(amenity === 'cinema' && (t.drive_in === 'yes' || /drive-?in/.test(name)), 'drive-in-movie');
  if (amenity === 'marketplace') a.add(/flea|antique|swap/.test(name) ? 'flea-market' : 'food-market');
  add(shop === 'books', 'bookstore');
  add(['fabric', 'sewing'].includes(shop), 'sewing-class');
  add(['wool', 'yarn'].includes(shop) || name.includes('yarn'), 'knitting-or-crocheting');
  add(t.craft === 'pottery' || /pottery|ceramic/.test(name), 'pottery-class');
  const cuisine = (t.cuisine ?? '').replace(new RegExp(`\\b${LOCAL_CUISINE[country] ?? '-'}\\b`, 'g'), '');
  add(NEW_CUISINE.test(cuisine), 'new-cuisine');
  add(t.man_made === 'observatory' || name.includes('observatory'), 'stargazing');
  add(t.route === 'bicycle', 'bike-path');
  add(/\baxe\b/.test(name), 'axe-throwing');
  add(/expo center|state fair/.test(name), 'state-fair');
  add(tourism === 'attraction' && a.size === 0 && t.wikidata, 'city-landmark');
  return a;
}

// Matches the validator's limit.
const MAX_KM = 300;
const SPREAD_OUT = new Set(['hike-a-trail', 'bike-path', 'city-park']);
// Keeps letters in any script, so two different Korean names don't both normalize to an empty string.
const normal = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
// Fields and courts are often named just "1" or "A". Two Korean, Chinese or Japanese characters already make a name.
const REAL_NAME = /[a-z]{3}|[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2}/iu;

function km(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371;
}

// Matches the validator. Longer opening_hours values are rare, and usually a list of exceptions nobody can read on a phone.
const MAX_HOURS = 255;
const WHEELCHAIR = new Set(['yes', 'limited', 'no']);
/** Wheelchair access and opening hours, when OSM has them. */
function extras(t) {
  const out = {};
  if (WHEELCHAIR.has(t.wheelchair)) out.wheelchair = t.wheelchair;
  const hours = t.opening_hours?.trim();
  if (hours && hours.length <= MAX_HOURS) out.hours = hours;
  return out;
}

const before = new Set(city.places.filter((p) => p.id.startsWith('osm:')).map((p) => p.id));
const handPicked = city.places.filter((p) => !p.id.startsWith('osm:'));
const imported = [];
let merged = 0;

for (const e of await fetchElements()) {
  const t = e.tags ?? {};
  const activities = activitiesFor(t, city.country);
  const center = e.center ?? e;
  if (!activities.size || !REAL_NAME.test(t.name ?? '') || center.lat == null) continue;
  // Sites spread across states, like some national parks, have a center far outside the city.
  if (km(city, { lat: center.lat, lng: center.lon }) > MAX_KM) continue;
  const place = {
    // OSM ids, unlike names, survive renames and tell apart places that share a name. No city in them, so a place
    // keeps its id however the catalog is split up.
    id: `osm:${e.type[0]}${e.id}`,
    // Where the local name isn't in the Latin alphabet, like in Seoul, the English one when OSM has it.
    name: /\p{Script=Latin}/u.test(t.name) ? t.name : (t['name:en'] ?? t.name),
    lat: Math.round(center.lat * 1e4) / 1e4,
    lng: Math.round(center.lon * 1e4) / 1e4,
    activities: [...activities].sort(),
    ...extras(t),
  };
  // The same venue can be mapped twice (a point and a building), or already be hand-picked.
  // Big parks and trails are often mapped in pieces, while chain stores sharing a name sit farther apart.
  const range = place.activities.some((id) => SPREAD_OUT.has(id)) ? 5 : 1;
  const same = [...handPicked, ...imported].find((p) => normal(p.name) === normal(place.name) && km(p, place) < range);
  if (same) {
    same.activities = [...new Set([...same.activities, ...place.activities])].sort();
    // A place's own details win; OSM only fills in what's missing.
    for (const [key, value] of Object.entries(extras(t))) same[key] ??= value;
    merged++;
  } else {
    imported.push(place);
  }
}

city.places = [...handPicked, ...imported].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
const line = (o) => `    ${JSON.stringify(o).replaceAll('":', '": ').replaceAll(',"', ', "')}`;
const { icons, places, ...head } = city;
writeFileSync(
  file,
  `{\n${Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')}` +
    `  "icons": [\n${icons.map(line).join(',\n')}\n  ],\n  "places": [\n${places.map(line).join(',\n')}\n  ]\n}\n`,
);
const after = new Set(imported.map((p) => p.id));
const gone = [...before].filter((id) => !after.has(id)).length;
const fresh = [...after].filter((id) => !before.has(id)).length;
const withAccess = city.places.filter((p) => p.wheelchair).length;
const withHours = city.places.filter((p) => p.hours).length;
console.log(
  `${imported.length} OSM places (${fresh} new, ${gone} gone since the last import), ${merged} merged into existing ones, ` +
    `${city.places.length} in total. ${withAccess} with wheelchair access, ${withHours} with opening hours.`,
);
