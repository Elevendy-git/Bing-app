import { describe, expect, it } from "vitest";
import { deleteBackward } from "./textEditing";

describe("Delete a visible character", () => {
  it.each(["🌍", "👍🏽", "🇨🇳", "👩‍👩‍👧‍👦", "e\u0301"])("removes the entire %s grapheme at the caret", character => {
    const value = `Go ${character} today`;
    expect(deleteBackward(value, 3 + character.length)).toEqual({ value: "Go  today", caret: 3 });
  });
  it("keeps selections and start-of-text deletion intact", () => {
    expect(deleteBackward("Weather today", 8, 13)).toEqual({ value: "Weather ", caret: 8 });
    expect(deleteBackward("Hello", 0)).toEqual({ value: "Hello", caret: 0 });
    expect(deleteBackward("", 0)).toEqual({ value: "", caret: 0 });
  });
  it("does not leave a broken emoji when a programmatic selection splits a grapheme", () => {
    expect(deleteBackward("a🌍b", 2)).toEqual({ value: "ab", caret: 1 });
    expect(deleteBackward("a👍🏽b", 2, 4)).toEqual({ value: "ab", caret: 1 });
  });
});
