import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Search } from "./Search";
import { Recent } from "../Recent/Recent";
import { keyboardSuggestions } from "./keyboardSuggestions";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (path: string) => {
  const query = new URL(path, "http://localhost").searchParams.get("query") ?? "";
  return { ok: true, json: async () => [query, [query, `${query} forecast`, `${query} today`]] };
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(["Search", "Recent"])("%s real keyboard input", page => {
  const setup = () => {
    const submit = vi.fn();
    render(page === "Search" ? <Search interactive history={[]} onSubmit={submit} />
      : <Recent tabs={[]} historyEntries={[]} bookmarkEntries={[]} conversationEntries={[]} onSearchSubmit={submit} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    act(() => input.focus());
    const keyboard = within(screen.getByRole("group", { name: "iOS keyboard" }));
    return { input, keyboard, submit, press: (name: string) => fireEvent.click(keyboard.getByRole("button", { name })) };
  };

  it("updates actual provider predictions, inserts without submitting, and clears stale words", async () => {
    const { input, keyboard, submit, press } = setup();
    expect(keyboard.queryByText("Designs")).toBeNull();
    fireEvent.change(input, { target: { value: "Weather" } });
    const prediction = await keyboard.findByRole("button", { name: "Use suggestion: Weather forecast" });
    fireEvent.click(prediction);
    expect(input).toHaveValue("Weather forecast");
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe("Weather forecast".length);
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Other" } });
    expect(keyboard.queryByRole("button", { name: "Use suggestion: Weather today" })).toBeNull();
    await keyboard.findByRole("button", { name: "Use suggestion: Other today" });
    press("Search");
    expect(submit).toHaveBeenCalledWith("Other");
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(keyboard.getByRole("group", { name: "Keyboard suggestions" })).toHaveTextContent("");
    expect(keyboard.queryByRole("button", { name: /^Use suggestion:/ })).toBeNull();
  });

  it("uses exact case at the caret and supports actual numbers, symbols and emoji deletion", () => {
    const { input, press } = setup();
    fireEvent.change(input, { target: { value: "Weather today" } });
    input.setSelectionRange(8, 13);
    press("Shift"); press("A");
    expect(input).toHaveValue("Weather A");
    press("Show numbers"); press("1"); press("Show symbols"); press("€");
    press("Show emoji keyboard"); press("Insert 👍🏽");
    expect(input).toHaveValue("Weather A1€👍🏽");
    press("Delete character");
    expect(input).toHaveValue("Weather A1€");
    expect(input.selectionStart).toBe("Weather A1€".length);
    expect(input).toHaveFocus();
  });

  it("shows no fabricated remote predictions after a failed provider response", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    const { input, keyboard } = setup();
    fireEvent.change(input, { target: { value: "Unusual" } });
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(keyboard.getAllByRole("button", { name: /^Use suggestion:/ })).toHaveLength(1);
    expect(keyboard.getByRole("button", { name: "Use suggestion: Unusual" })).toHaveTextContent("“Unusual”");
  });
});

it("keeps previous-query loading results out of keyboard predictions and deduplicates the typed query", () => {
  const items = ["Weather", "WEATHER", "Weather today", "Weather today", "Weather forecast"].map(query => ({ query, source: "prediction" as const }));
  expect(keyboardSuggestions("Weather", { query: "Weather", source: "live", items })).toEqual(["Weather", "Weather today", "Weather forecast"]);
  expect(keyboardSuggestions("Weather t", { query: "Weather t", source: "loading", items })).toEqual(["Weather t", "", ""]);
  expect(keyboardSuggestions("Other", { query: "Weather", source: "live", items })).toEqual(["Other", "", ""]);
  expect(keyboardSuggestions("", { query: "Weather", source: "live", items })).toEqual(["", "", ""]);
});
