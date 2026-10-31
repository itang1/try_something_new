// Adds Overture Maps places to a city file, matched to activities by Overture's category taxonomy and by name.
// Businesses like escape rooms, studios, and restaurants come from here; parks, trails, and bike routes from import-osm.mjs.
// Setup: `npm install --prefix scripts/overture`. Usage: npm run overture -- <city> [radius km]
// A new city needs its details once: npm run overture -- <city> --name "Kyoto" --country JP --lat 35.0116 --lng 135.7681 [--region ...]
// Where DuckDB can't download its httpfs extension, pass --from with a local GeoParquet extract of the same release, for example
// from `overturemaps download --bbox ... -f geoparquet -t place`.
// Re-running replaces the earlier Overture places; OSM and hand-picked places keep their ids and gain matched activities.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DuckDBInstance } from '@duckdb/node-api';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { from: { type: 'string' }, name: { type: 'string' }, region: { type: 'string' }, country: { type: 'string' }, lat: { type: 'string' }, lng: { type: 'string' } },
});
const [cityId, radiusArg = '40'] = positionals;
if (!cityId) throw new Error('Usage: npm run overture -- <city> [radius km] [--name --country --lat --lng --region]');
const RADIUS_KM = Number(radiusArg);
// Low scores are mostly stale listings and registered businesses with no storefront.
const MIN_CONFIDENCE = 0.7;
// Matches the validator's limit.
const MAX_KM = 300;

// Overture category → activity. A place matches through its own category or any category above it in the taxonomy.
const CATEGORIES = {
  arcade: 'arcade',
  archery_range: 'archery',
  art_museum: 'art-museum',
  art_gallery: 'art-museum',
  history_museum: 'science-history-museum',
  science_museum: 'science-history-museum',
  childrens_museum: 'science-history-museum',
  planetarium: 'science-history-museum',
  zoo: 'zoo-aquarium',
  aquarium: 'zoo-aquarium',
  bowling_alley: 'bowling',
  escape_room: 'escape-room',
  karaoke_venue: 'karaoke',
  paint_your_own_pottery_venue: 'pottery-class',
  rock_climbing_gym: 'rock-climbing',
  // Korean climbing gyms are mostly filed here.
  rock_climbing_spot: 'rock-climbing',
  trampoline_park: 'trampoline-park',
  ice_skating_rink: 'ice-skating',
  roller_skating_rink: 'roller-skating',
  go_kart_track: 'go-karts',
  go_kart_club: 'go-karts',
  miniature_golf_course: 'mini-golf',
  golf_course: 'golf',
  disc_golf_course: 'disc-golf',
  botanical_garden: 'botanical-garden',
  brewery: 'brewery-tasting',
  winery: 'brewery-tasting',
  distillery: 'brewery-tasting',
  cidery: 'brewery-tasting',
  tea_room: 'afternoon-tea',
  coffee_roastery: 'coffee-roaster',
  dim_sum_restaurant: 'dim-sum',
  food_tour: 'food-tour',
  farmers_market: 'food-market',
  public_market: 'food-market',
  flea_market: 'flea-market',
  bookstore: 'bookstore',
  library: 'library',
  comedy_club: 'stand-up-comedy',
  jazz_and_blues_venue: 'live-music',
  theatre_venue: 'live-show',
  opera_and_ballet: 'live-show',
  band_orchestra_symphony: 'live-show',
  dance_studio: 'dance-class',
  yoga_studio: 'yoga-class',
  pilates_studio: 'pilates',
  martial_arts_club: 'martial-arts',
  fencing_club: 'fencing',
  pickleball_court: 'pickleball',
  sauna: 'sauna',
  public_bath_house: 'sauna',
  float_spa: 'float-tank',
  glass_blowing_venue: 'glassblowing',
  cooking_school: 'cooking-class',
  cooking_classes: 'cooking-class',
  fabric_store: 'sewing-class',
  knitting_supply_store: 'knitting-or-crocheting',
  embroidery_and_crochet_store: 'embroidery',
  music_school: 'music-lesson',
  choir: 'choir',
  horseback_riding_service: 'horseback-riding',
  horse_riding: 'horseback-riding',
  fishing_charter: 'fishing',
  canoe_and_kayak_hire_service: 'kayaking',
  rafting_kayaking_area: 'kayaking',
  paddleboarding_center: 'paddleboarding',
  paddleboard_rental: 'paddleboarding',
  surfing_school: 'surf-lesson',
  sailing_club: 'sailing-lesson',
  beach: 'beach-day',
  observatory: 'stargazing',
  hiking_trail: 'hike-a-trail',
  nature_reserve: 'hike-a-trail',
  state_park: 'hike-a-trail',
  national_park: 'hike-a-trail',
  waterfall: 'waterfall-hike',
  orchard: 'apple-picking',
  pick_your_own_farm: 'apple-picking',
  pumpkin_patch: 'corn-maze',
  cave: 'cave-tour',
  food_bank: 'volunteer',
  circus_school: 'trapeze',
  ferry_service: 'island-ferry',
  ski_resort: 'snow-sports',
};
// Only the category itself, since everything under it (karaoke, choirs, museums of every kind) has its own entry.
const EXACT = { music_venue: 'live-music', museum: 'science-history-museum', swimming_pool: 'lap-swimming', fairgrounds: 'state-fair', drive_in_theater: 'drive-in-movie' };
// Matches import-osm.mjs: cuisines most people haven't tried yet.
const CUISINES = [
  'afghani', 'brazilian', 'burmese', 'caribbean', 'colombian', 'cuban', 'eritrean', 'ethiopian', 'filipino', 'georgian', 'haitian',
  'indonesian', 'jamaican', 'korean', 'lebanese', 'malaysian', 'moroccan', 'nepalese', 'nigerian', 'persian', 'peruvian',
  'senegalese', 'somali', 'sri_lankan', 'taiwanese', 'turkish', 'ukrainian', 'uzbek', 'venezuelan', 'vietnamese', 'west_african',
];
for (const c of CUISINES) CATEGORIES[`${c}_restaurant`] = 'new-cuisine';
// A city's own cuisine isn't new there: Seoul has thousands of Korean restaurants.
const LOCAL_CUISINE = { KR: 'korean_restaurant' };
// For activities with no category of their own.
const NAMES = [
  [/\bhot ?pot\b|shabu/, 'hot-pot'],
  [/board ?game|tabletop|game (cafe|café|lounge)/, 'board-game-cafe'],
  [/\baxe\b/, 'axe-throwing'],
  [/trampoline|sky zone|urban air/, 'trampoline-park'],
  [/pottery|ceramics (studio|class)|clay studio/, 'pottery-class'],
  [/climbing|bouldering/, 'rock-climbing'],
  [/glass ?blow/, 'glassblowing'],
  // Korean names, for venues Overture files under a broad category like spa or cafe.
  [/찜질방|불가마|한증막|사우나/, 'sauna'],
  [/방탈출/, 'escape-room'],
  [/보드게임/, 'board-game-cafe'],
  [/클라이밍|볼더링/, 'rock-climbing'],
  [/도예(공방|교실|원|스튜디오)|도자기 ?(공방|체험|교실)|물레/, 'pottery-class'],
  [/훠궈|샤브샤브/, 'hot-pot'],
  [/노래방|노래연습장/, 'karaoke'],
  [/양궁(장|카페)|국궁|활터/, 'archery'],
];
// Bookstores for course textbooks aren't somewhere to browse.
const SKIP = new Set(['academic_bookstore', 'swimming_instructor']);
// Tradespeople and suppliers often carry the category of what they install or sell.
const NOT_A_VENUE = /remodel|install|contractor|construction|repair|suppl(y|ies)|wholesale|detailing|coating|dental|animal control/i;
// Names an activity's places have to match, or must not, where the category alone lets in the wrong kind of place.
const NAME_RULES = {
  'drive-in-movie': { need: /drive.?in/ },
  'state-fair': { need: /fair/ },
  library: { not: /universit|college|school|law|little free|학교|스터디|독서실|열람실/ },
  bookstore: { not: /universit|college|대학교/ },
  // The Korean rules below can't match an English name, so they only change Korean cities.
  // Screen golf, driving ranges and lessons aren't a round of golf.
  golf: { not: /골프존|스크린|gdr|연습장|아카데미|레슨/ },
  'live-music': { not: /노래/ },
  'food-market': { not: /마트|한살림|hansalim|가게/ },
  // Water skiing.
  'snow-sports': { not: /수상/ },
};
// Some listings sit in the wrong city: a Busan beach or a North Korean mountain with a pin in Seoul.
const FAR_AWAY = { KR: /부산|busan|제주|jeju|강원도|강릉|금강산|해운대|경포|대천|안면/ };

// Keeps letters in any script, so two different Korean names don't both normalize to an empty string.
const normal = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function km(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(x, (b.lat - a.lat) * rad) * 6371;
}

function activitiesFor(row, country) {
  const found = new Set();
  const hierarchy = row.hierarchy ?? [];
  if (!SKIP.has(row.category)) {
    for (const c of hierarchy) if (CATEGORIES[c] && c !== LOCAL_CUISINE[country]) found.add(CATEGORIES[c]);
    if (EXACT[row.category]) found.add(EXACT[row.category]);
  }
  const name = row.name.toLowerCase();
  for (const [pattern, id] of NAMES) if (pattern.test(name)) found.add(id);
  for (const [id, { need, not }] of Object.entries(NAME_RULES)) {
    if ((need && !need.test(name)) || not?.test(name)) found.delete(id);
  }
  return NOT_A_VENUE.test(name) || FAR_AWAY[country]?.test(name) ? new Set() : found;
}

const file = `data/cities/${cityId}.json`;
let city;
if (existsSync(file)) {
  city = JSON.parse(readFileSync(file, 'utf8'));
} else {
  const { name, region, country, lat, lng } = values;
  if (!name || !country || !lat || !lng) throw new Error(`${file} doesn't exist yet, so pass --name, --country, --lat, and --lng`);
  city = { id: cityId, name, ...(region && { region }), country, lat: Number(lat), lng: Number(lng), icons: [], places: [] };
}

const db = await (await DuckDBInstance.create()).connect();
if (!values.from) await db.run("INSTALL httpfs; LOAD httpfs; SET s3_region = 'us-west-2';");
const read = async (sql) => (await db.runAndReadAll(sql)).getRowObjectsJson();
const [{ release }] = values.from
  ? [{ release: values.from }]
  : await read("SELECT max(regexp_extract(file, 'release/([^/]+)/', 1)) AS release FROM glob('s3://overturemaps-us-west-2/release/*/theme=places/type=place/*')");
const source = values.from
  ? `read_parquet('${values.from.replaceAll("'", "''")}')`
  : `read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning = 1)`;
const dLat = RADIUS_KM / 111;
const dLng = RADIUS_KM / (111 * Math.cos((city.lat * Math.PI) / 180));
const keys = [...Object.keys(CATEGORIES), ...Object.keys(EXACT)].map((k) => `'${k}'`).join(', ');
const namePattern = NAMES.map(([p]) => p.source).join('|').replaceAll("'", "''");
console.log(`Reading Overture ${release} within ${RADIUS_KM} km of ${city.name}…`);
const rows = await read(`
  SELECT id, names.primary AS name, (bbox.xmin + bbox.xmax) / 2 AS lng, (bbox.ymin + bbox.ymax) / 2 AS lat,
    taxonomy.primary AS category, taxonomy.hierarchy AS hierarchy
  FROM ${source}
  WHERE bbox.xmin BETWEEN ${city.lng - dLng} AND ${city.lng + dLng}
    AND bbox.ymin BETWEEN ${city.lat - dLat} AND ${city.lat + dLat}
    AND confidence >= ${MIN_CONFIDENCE}
    AND coalesce(operating_status, 'open') = 'open'
    AND names.primary IS NOT NULL
    AND (list_has_any(taxonomy.hierarchy, [${keys}]) OR regexp_matches(lower(names.primary), '${namePattern}'))
`);

const kept = city.places.filter((p) => !p.id.startsWith('ovt:'));
const imported = [];
let merged = 0;
for (const row of rows) {
  const activities = activitiesFor(row, city.country);
  // Registered companies, like "Audio Stream Inc", are rarely somewhere to visit.
  if (!activities.size || /\b(llc|inc|ltd|corp)\b\.?$/i.test(row.name) || km(city, row) > MAX_KM) continue;
  const place = {
    id: `ovt:${row.id}`,
    name: row.name,
    lat: Math.round(row.lat * 1e4) / 1e4,
    lng: Math.round(row.lng * 1e4) / 1e4,
    activities: [...activities].sort(),
  };
  // Many venues are already in the file from OpenStreetMap or a hand pick, under the same name.
  const range = activities.has('hike-a-trail') || activities.has('beach-day') ? 5 : 1;
  const same = [...kept, ...imported].find((p) => normal(p.name) === normal(place.name) && km(p, place) < range);
  if (same) {
    same.activities = [...new Set([...same.activities, ...place.activities])].sort();
    merged++;
  } else {
    imported.push(place);
  }
}

city.places = [...kept, ...imported].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
const line = (o) => `    ${JSON.stringify(o).replaceAll('":', '": ').replaceAll(',"', ', "')}`;
const { icons, places, ...head } = city;
writeFileSync(
  file,
  `{\n${Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')}` +
    `  "icons": [\n${icons.map(line).join(',\n')}\n  ],\n  "places": [\n${places.map(line).join(',\n')}\n  ]\n}\n`,
);
console.log(`${imported.length} Overture places added, ${merged} merged into existing ones, ${city.places.length} in total`);
