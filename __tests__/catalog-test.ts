import { homeSpotId, isHomeSpot, kindsOf, withParents, listOr, spotsFor, type Entry, type Place } from '@/data/catalog';

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

  it('checks off the broader activity along with a specific one', () => {
    expect(withParents(['origami'])).toEqual(['origami', 'try-a-craft']);
    expect(withParents(['origami', 'tie-dye'])).toEqual(['origami', 'tie-dye', 'try-a-craft']);
    expect(withParents(['bowling'])).toEqual(['bowling']);
    expect(withParents(['make-pasta'])).toEqual(['make-pasta', 'cook-something-new']);
    expect(withParents(['learn-chess'])).toEqual(['learn-chess', 'learn-a-skill']);
  });
});
