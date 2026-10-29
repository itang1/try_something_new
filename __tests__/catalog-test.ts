import { kindsOf, listOr, type Entry } from '@/data/catalog';

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
});
