/** The column count and tile size that fit `count` square tiles into a box as large as they can be. */
export function fitGrid(count: number, width: number, height: number, gap: number): { columns: number; size: number } {
  let best = { columns: 1, size: 0 };
  for (let columns = 1; columns <= Math.max(1, count); columns++) {
    const rows = Math.ceil(count / columns);
    const size = Math.min((width - (columns - 1) * gap) / columns, (height - (rows - 1) * gap) / rows);
    if (size > best.size) best = { columns, size };
  }
  return { columns: best.columns, size: Math.max(0, Math.floor(best.size * 100) / 100) };
}
