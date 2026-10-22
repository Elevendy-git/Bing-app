import { describe, expect, it } from "vitest";
import { getPreviewSearchSuggestions } from "./Search.suggestions";

describe("Search suggestion preview data", () => {
  it.each(["Weather", "We", "Weather fore", "1111", "C++", "天气", "a new query"])(
    "returns five distinct related queries for %s", (input) => {
      const items = getPreviewSearchSuggestions(input);
      expect(items).toHaveLength(5);
      expect(new Set(items.map(({ query }) => query.toLowerCase())).size).toBe(5);
      expect(items.every(({ query }) => query.toLowerCase().startsWith(input.toLowerCase()))).toBe(true);
    },
  );

  it("keeps the five design fixtures and their data-provided sources and logos", () => {
    const items = getPreviewSearchSuggestions("  WEATHER  ");
    expect(items.map(({ query }) => query)).toEqual(["Weather", "Weather forecast", "Weather today", "Weather hk", "Weather nanning"]);
    expect(items.map(({ source }) => source)).toEqual(["prediction", "history", "history", "prediction", "prediction"]);
    expect(items.filter(({ logoUrl }) => logoUrl)).toHaveLength(2);
    expect(getPreviewSearchSuggestions("   ")).toEqual([]);
  });
});
