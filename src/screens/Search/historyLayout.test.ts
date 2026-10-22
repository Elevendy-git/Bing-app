import { describe, expect, it } from "vitest";
import { historyLayout } from "./historyLayout";

describe("Search history row limits", () => {
  it("omits the arrow for empty history or history fitting within two rows", () => {
    expect(historyLayout([], 362)).toMatchObject({ count: 0, overflow: false, collapsedRows: 0 });
    expect(historyLayout([140, 176, 92, 96], 362)).toMatchObject({ count: 4, overflow: false, collapsedRows: 2 });
  });

  it("reserves space for the arrow on the second row and reveals all rows when expanded", () => {
    const widths = [140, 176, 92, 96, 92, 140, 176, 96];
    expect(historyLayout(widths, 362)).toEqual({ count: 5, overflow: true, collapsedRows: 2, expandedRows: 4 });
    // Less space requires removing the last pill from the second row, not adding a third row for the arrow.
    expect(historyLayout(widths, 330)).toMatchObject({ count: 4, overflow: true, collapsedRows: 2 });
    expect(historyLayout(widths, 660)).toMatchObject({ count: 8, overflow: false, collapsedRows: 2 });
  });

  it("reflows after deletion and handles a query wider than the canvas", () => {
    expect(historyLayout([140, 176, 92, 96, 92], 362)).toMatchObject({ count: 5, overflow: false });
    expect(historyLayout([1000, 1000, 1000], 362)).toMatchObject({ count: 1, overflow: true, collapsedRows: 2 });
    expect(historyLayout([1000], 362)).toMatchObject({ count: 1, overflow: false, collapsedRows: 1 });
  });
});
