import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchSuggestions } from "./SearchSuggestions";
import { Search } from "./Search";
import { Recent } from "../Recent/Recent";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["baidu", ["baidu maps", "baidu translate"]] }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe("suggestion connection and recovery states", () => {
  it("shows loading only after a sustained wait and resets it for a replacement query", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SearchSuggestions query="baidu" items={[]} source="loading" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await advance(999);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await advance(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading suggestions…");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<SearchSuggestions query="weather" items={[]} source="loading" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await advance(1000);
    expect(screen.getByRole("status")).toBeVisible();
    rerender(<SearchSuggestions query="weather" items={[]} source="live" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("preserves real rows during updates without adding a loading row", async () => {
    vi.useFakeTimers();
    render(<SearchSuggestions query="baidu" items={[{ query: "baidu maps", source: "prediction" }]} source="loading" />);
    await advance(1000);
    expect(screen.getByRole("group", { name: "Search suggestions" })).toHaveTextContent("baidu maps");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each(["Search", "Recent"])("allows the same query to recover from an inline error in %s", async (page) => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const submit = vi.fn();
    if (page === "Search") render(<Search initialQuery="baidu" initialState="input" interactive onSubmit={submit} />);
    else {
      render(<Recent tabs={[]} historyEntries={[]} conversationEntries={[]} bookmarkEntries={[]} onSearchSubmit={submit} />);
      fireEvent.change(screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" }), { target: { value: "baidu" } });
    }
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Suggestions couldn’t load");
    expect(screen.getByRole("searchbox")).toHaveValue("baidu");
    fireEvent.click(within(error).getByRole("button", { name: "Try again" }));
    const suggestion = await screen.findByRole("button", { name: "baidu maps" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("baidu");
    fireEvent.click(suggestion);
    expect(submit).toHaveBeenCalledWith("baidu maps");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
