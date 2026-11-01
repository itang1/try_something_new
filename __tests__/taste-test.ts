import { learnTaste, tasteWeight, weightedPick } from '@/data/taste';

describe('learning from ratings', () => {
  it('weights loved kinds up and "Not for me" kinds down, within limits', () => {
    const taste = learnTaste([
      { subcategory: 'make', level: 'easy', rating: 'loved' },
      { subcategory: 'make', level: 'easy', rating: 'loved' },
      { subcategory: 'move', level: 'stretch', rating: 'not-for-me' },
    ]);
    const art = tasteWeight({ subcategory: 'make', level: 'easy' }, taste);
    const sport = tasteWeight({ subcategory: 'move', level: 'stretch' }, taste);
    const food = tasteWeight({ subcategory: 'food', level: 'medium' }, taste);
    expect(art).toBeGreaterThan(2);
    expect(sport).toBeLessThan(0.6);
    expect(food).toBe(1);
    const lots = learnTaste(Array.from({ length: 20 }, () => ({ subcategory: 'make' as const, level: 'easy' as const, rating: 'loved' as const })));
    expect(tasteWeight({ subcategory: 'make', level: 'easy' }, lots)).toBe(3);
  });

  it('counts hidden ideas a little', () => {
    const taste = learnTaste([], [{ subcategory: 'shows', level: 'medium' }]);
    expect(tasteWeight({ subcategory: 'shows', level: 'easy' }, taste)).toBeLessThan(1);
  });

  it('picks by weight', () => {
    const items = ['a', 'b', 'c'];
    const weight = (x: string) => ({ a: 1, b: 2, c: 1 })[x]!;
    expect(weightedPick(items, weight, () => 0)).toBe('a');
    expect(weightedPick(items, weight, () => 0.3)).toBe('b');
    expect(weightedPick(items, weight, () => 0.74)).toBe('b');
    expect(weightedPick(items, weight, () => 0.99)).toBe('c');
  });
});
