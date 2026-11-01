import { fitGrid } from '@/data/card-grid';

describe('fitGrid', () => {
  it('fits every tile inside the box', () => {
    for (const [count, width, height] of [[122, 312, 420], [122, 320, 200], [9, 300, 300], [1, 300, 120], [57, 300, 500]]) {
      const { columns, size } = fitGrid(count, width, height, 4);
      const rows = Math.ceil(count / columns);
      expect(columns * size + (columns - 1) * 4).toBeLessThanOrEqual(width + 0.01);
      expect(rows * size + (rows - 1) * 4).toBeLessThanOrEqual(height + 0.01);
      expect(size).toBeGreaterThan(0);
    }
  });

  it('makes a square grid for a square count in a square box', () => {
    expect(fitGrid(9, 300, 300, 0)).toEqual({ columns: 3, size: 100 });
  });

  it('handles nothing to draw', () => {
    expect(fitGrid(0, 300, 300, 4).columns).toBe(1);
  });
});
