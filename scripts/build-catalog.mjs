// Writes the downloadable catalog to dist/catalog: an index of every city, and one file per city named by its content hash,
// so a CDN can cache city files forever and only index.json needs a short cache time. Run with `npm run catalog`.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = 'dist/catalog';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/cities`, { recursive: true });

const cities = [];
let bytes = 0;
for (const file of readdirSync('data/cities').filter((f) => f.endsWith('.json')).sort()) {
  const city = JSON.parse(readFileSync(`data/cities/${file}`, 'utf8'));
  const json = JSON.stringify(city);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 12);
  writeFileSync(`${out}/cities/${city.id}-${hash}.json`, json);
  bytes += json.length;
  const { id, name, region, country, lat, lng } = city;
  cities.push({ id, name, region, country, lat, lng, hash });
}
writeFileSync(`${out}/index.json`, JSON.stringify({ cities }));
console.log(`Wrote ${cities.length} cities (${Math.round(bytes / 1024)} KB) to ${out}`);
