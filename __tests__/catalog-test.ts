import {
  anywhereSpotId,
  homeSpotId,
  isAnywhereSpot,
  isHomeSpot,
  kindsOf,
  otherWays,
  spotName,
  withParents,
  listOr,
  spotsFor,
  type Entry,
  type Place,
} from '@/data/catalog';
import activitiesFile from '../data/activities.json';

const craft = { id: 'try-a-craft' } as Entry;
const origami = { id: 'origami', parent: 'try-a-craft' } as Entry;
const tieDye = { id: 'tie-dye', parent: 'try-a-craft' } as Entry;
const bowling = { id: 'bowling' } as Entry;

describe('catalog', () => {
  it('finds the specific kinds of a broad activity', () => {
    expect(kindsOf([craft, origami, bowling, tieDye], craft)).toEqual([origami, tieDye]);
    expect(kindsOf([craft, origami], bowling)).toEqual([]);
  });

  it('lists names with "or"', () => {
    expect(listOr(['origami'])).toBe('origami');
    expect(listOr(['origami', 'tie-dye'])).toBe('origami or tie-dye');
    expect(listOr(['origami', 'tie-dye', 'macrame'])).toBe('origami, tie-dye, or macrame');
  });

  it('offers home first, then places, when something can be done at home', () => {
    const studio = { id: 'osm:n1', name: 'Clay Studio' } as Place;
    const pottery = { kind: 'activity', activityId: 'pottery-class', home: 'Air-dry clay' } as Entry;
    expect(spotsFor(pottery, [studio])).toEqual([
      { id: 'home:pottery-class', name: 'At home' },
      { id: 'osm:n1', name: 'Clay Studio' },
    ]);
    expect(spotsFor({ ...pottery, home: undefined }, [studio])).toEqual([{ id: 'osm:n1', name: 'Clay Studio' }]);
    expect(isHomeSpot(homeSpotId('origami'))).toBe(true);
    expect(isHomeSpot('osm:n1')).toBe(false);
  });

  it('offers anywhere after the places, and names it for plans and memories', () => {
    const court = { id: 'osm:n2', name: 'Rec Center' } as Place;
    const pickleball = {
      kind: 'activity',
      activityId: 'pickleball',
      places: [court],
      anywhere: { where: 'A backyard or any tennis court', detail: 'Paddles and a ball' },
    } as Entry;
    expect(spotsFor(pickleball, [court])).toEqual([
      { id: 'osm:n2', name: 'Rec Center' },
      { id: 'any:pickleball', name: 'A backyard or any tennis court' },
    ]);
    expect(isAnywhereSpot(anywhereSpotId('pickleball'))).toBe(true);
    expect(isAnywhereSpot(homeSpotId('pickleball'))).toBe(false);
    expect(spotName(pickleball, 'any:pickleball')).toBe('A backyard or any tennis court');
    expect(spotName(pickleball, 'home:pickleball')).toBe('At home');
    expect(spotName(pickleball, 'osm:n2')).toBe('Rec Center');
    expect(spotName(pickleball, null)).toBeNull();
    expect(otherWays(pickleball)).toEqual([
      { kind: 'anywhere', icon: 'explore', title: 'A backyard or any tennis court', detail: 'Paddles and a ball' },
    ]);
  });

  it('lets games and sports that need no venue be done anywhere or at home', () => {
    const ways = (id: string) => activitiesFile.activities.find((a) => a.id === id) as Partial<Entry>;
    for (const id of ['pickleball', 'tennis', 'roller-skating', 'disc-golf']) expect(ways(id).anywhere).toBeDefined();
    for (const id of ['yoga-class', 'pilates', 'karaoke', 'mini-golf']) expect(ways(id).home).toBeDefined();
  });

  it('checks off the broader activity along with a specific one', () => {
    expect(withParents(['origami'])).toEqual(['origami', 'try-a-craft']);
    expect(withParents(['origami', 'tie-dye'])).toEqual(['origami', 'tie-dye', 'try-a-craft']);
    expect(withParents(['bowling'])).toEqual(['bowling']);
  });
});
