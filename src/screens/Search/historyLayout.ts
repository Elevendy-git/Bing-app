/** Pack actual pill widths into two rows, reserving space for the expand control. */
export function historyLayout(widths: readonly number[], available: number, gap = 8, toggleWidth = 38) {
  const rowsFor = (items: readonly number[]) => {
    let rows = 0;
    let used = 0;
    for (const item of items) {
      const width = Math.min(item, available);
      if (!rows || used + gap + width > available + 0.01) { rows++; used = width; }
      else used += gap + width;
    }
    return rows;
  };
  const rows = rowsFor(widths);
  if (rows <= 2) return { count: widths.length, overflow: false, collapsedRows: rows, expandedRows: rows };
  let count = widths.length;
  while (count > 0 && rowsFor([...widths.slice(0, count), toggleWidth]) > 2) count--;
  return {
    count, overflow: true,
    collapsedRows: rowsFor([...widths.slice(0, count), toggleWidth]),
    expandedRows: rowsFor([...widths, toggleWidth]),
  };
}
