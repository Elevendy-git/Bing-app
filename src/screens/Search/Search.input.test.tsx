import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Search } from "./Search";
import { Recent } from "../Recent/Recent";
import { SEARCH_QUERY_MAX_LENGTH } from "../../services/searchSuggestions";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ["", []] }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(["Search", "Recent"])("%s shared input behavior", page => {
  const setup = () => {
    const submit = vi.fn();
    render(page === "Search" ? <Search interactive history={[]} onSubmit={submit} />
      : <Recent tabs={[]} historyEntries={[]} bookmarkEntries={[]} conversationEntries={[]} onSearchSubmit={submit} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    act(() => input.focus());
    const content = screen.getByRole("region", { name: `${page} content` });
    return { input, content, submit, keyboard: within(screen.getByRole("group", { name: "iOS keyboard" })) };
  };

  it("enforces the same length for pasted and simulated input, while allowing selection replacement", () => {
    const { input, keyboard } = setup();
    expect(input).toHaveAttribute("maxlength", String(SEARCH_QUERY_MAX_LENGTH));
    fireEvent.change(input, { target: { value: "x".repeat(SEARCH_QUERY_MAX_LENGTH + 1) } });
    expect(input.value).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
    input.setSelectionRange(input.value.length, input.value.length);
    fireEvent.click(keyboard.getByRole("button", { name: "a" }));
    expect(input.value).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
    input.setSelectionRange(0, 1);
    fireEvent.click(keyboard.getByRole("button", { name: "a" }));
    expect(input.value).toBe(`a${"x".repeat(SEARCH_QUERY_MAX_LENGTH - 1)}`);
    expect(input.selectionStart).toBe(1);
    fireEvent.change(input, { target: { value: `${"x".repeat(SEARCH_QUERY_MAX_LENGTH - 1)}👍🏽` } });
    expect(input.value).toBe("x".repeat(SEARCH_QUERY_MAX_LENGTH - 1));
  });

  it("ignores multi-finger gestures and dismisses on vertical dragging without clearing the draft", () => {
    const { input, content } = setup();
    fireEvent.change(input, { target: { value: "Weather" } });
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 20 }, { clientX: 120, clientY: 20 }] });
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 50 }] });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(input).toHaveValue("Weather");
  });

  it("preserves composition and normalizes only submitted text", () => {
    const { input, submit } = setup();
    fireEvent.change(input, { target: { value: "  Weather   today  " } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(submit).not.toHaveBeenCalled();
    expect(input).toHaveValue("  Weather   today  ");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(submit).toHaveBeenCalledWith("Weather today");
  });
});
