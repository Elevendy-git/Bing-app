import { describe, expect, it } from "vitest";
import { itemMenuPosition } from "./AnchoredMenu";

function geometry(scale: number, top: number, bottom: number) {
  const screen = document.createElement("main");
  const button = document.createElement("button");
  Object.defineProperties(screen, { offsetWidth: { value: 402 }, clientHeight: { value: 874 } });
  screen.getBoundingClientRect = () => ({ top: 100, right: 50 + 402 * scale, width: 402 * scale } as DOMRect);
  button.getBoundingClientRect = () => ({ top: 100 + top * scale, bottom: 100 + bottom * scale, right: 50 + 370 * scale } as DOMRect);
  return { screen, button };
}

describe("Anchored menu geometry", () => {
  it.each([0.5, 1, 1.5])("uses phone coordinates at %s workbench zoom", scale => {
    const { screen, button } = geometry(scale, 300, 324);
    expect(itemMenuPosition(screen, button, { height: 56 })).toEqual({ top: 322, right: 38 });
  });
  it("flips above the trigger for keyboard/footer bounds and preserves Bookmark overlap", () => {
    const { screen, button } = geometry(0.5, 500, 524);
    expect(itemMenuPosition(screen, button, { height: 56, bottomInset: 332 })).toEqual({ top: 446, right: 38 });
    expect(itemMenuPosition(screen, button, { height: 96, overlap: 6, bottomInset: 332 })).toEqual({ top: 410, right: 38 });
  });
  it("keeps flipped menus below the fixed header", () => {
    const { screen, button } = geometry(1, 40, 64);
    expect(itemMenuPosition(screen, button, { height: 56 }).top).toBe(118);
  });
});
