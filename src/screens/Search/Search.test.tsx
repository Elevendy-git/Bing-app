import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Search } from "./Search";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const query = new URL(url, "http://localhost").searchParams.get("query") ?? "";
    const items = query === "Weather"
      ? ["Weather", "Weather channel", "Weather underground", "Weather radar", "Weather forecast"]
      : [query, `${query} meaning`, `${query} angel number`, `${query} in binary`, `${query} in words`];
    return { ok: true, json: async () => [query, items] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Query entry flow", () => {
  it.each(["🌍", "👍🏽", "🇨🇳", "👩‍👩‍👧‍👦", "e\u0301"])("deletes %s as a whole character and keeps the caret in place", character => {
    render(<Search interactive initialState="keyboard" />);
    const input = screen.getByRole("searchbox", { name: "Search query" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: `Hello ${character} world` } });
    input.setSelectionRange(6 + character.length, 6 + character.length);
    fireEvent.click(screen.getByRole("button", { name: "Delete character" }));
    expect(input).toHaveValue("Hello  world");
    expect(input.selectionStart).toBe(6);
    expect(input).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "a" }));
    expect(input).toHaveValue("Hello a world");
    expect(input.selectionStart).toBe(7);
  });

  it.each(["zero-input", "keyboard"] as const)("leaves %s content blank without history or discovery requests", (initialState) => {
    render(<Search interactive initialState={initialState} history={[]} />);
    const content = screen.getByRole("region", { name: "Search content" });
    expect(content.textContent).toBe("");
    expect(content.querySelector("section")).toBeNull();
    expect(within(content).queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick features")).not.toBeInTheDocument();
    expect(screen.queryByText("You might like")).not.toBeInTheDocument();
    expect(screen.queryByText("What’s trending")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dismisses the keyboard for vertical content scrolling, not horizontal swipes or zoom", () => {
    render(<Search interactive initialState="keyboard" />);
    const content = screen.getByRole("region", { name: "Search content" });
    const keyboard = screen.getByRole("group", { name: "iOS keyboard" });
    fireEvent.wheel(content, { deltaX: 70, deltaY: 2 });
    fireEvent.wheel(content, { deltaY: 70, ctrlKey: true });
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 30, clientY: 105 }] });
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    fireEvent.touchMove(content, { touches: [{ clientX: 95, clientY: 50 }] });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search query" }));
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
  });
  it("moves between zero input, keyboard and live suggestions without inventing a result page", async () => {
    render(<Search interactive />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    await waitFor(() => expect(screen.getByRole("region", { name: "Recent searches" })).toBeVisible());
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.change(input, { target: { value: "Weather" } });
    expect(await screen.findByText("channel")).toBeVisible();
    const suggestions = screen.getByRole("group", { name: "Search suggestions" });
    expect(suggestions.children).toHaveLength(5);
    expect(within(suggestions).getAllByRole("img", { name: "From search history" })).toHaveLength(2);
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(3);
    expect(suggestions.querySelectorAll("img")).toHaveLength(0);
    expect(within(suggestions).getByText("forecast")).toBeVisible();
    expect(suggestions.parentElement).toHaveAttribute("data-suggestions-source", "live");
    expect(within(suggestions).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("main", { name: "Search page" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(input).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("region", { name: "Recent searches" })).toBeVisible());
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it("accepts keyboard characters and deletes text while preserving input focus", () => {
    render(<Search initialState="keyboard" interactive />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    const keyboard = screen.getByRole("group", { name: "iOS keyboard" });
    fireEvent.click(screen.getByRole("button", { name: "W" }));
    expect(input).toHaveValue("W");
    fireEvent.click(screen.getByRole("button", { name: "e" }));
    expect(input).toHaveValue("We");
    fireEvent.click(screen.getByRole("button", { name: "Delete character" }));
    expect(input).toHaveValue("W");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "unrelated query" } });
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    fireEvent.wheel(screen.getByRole("region", { name: "Search content" }), { deltaY: 20 });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(input).toHaveValue("unrelated query");
    // Refocusing can reverse an in-flight dismissal without replacing the keyboard or query.
    fireEvent.focus(input);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    expect(input).toHaveValue("unrelated query");
  });

  it("shows five live numeric suggestions and restores history for whitespace-only input", async () => {
    render(<Search interactive />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "1111" } });
    expect(await screen.findByText("angel number")).toBeVisible();
    const suggestions = screen.getByRole("group", { name: "Search suggestions" });
    expect(suggestions.children).toHaveLength(5);
    expect(within(suggestions).getByText("angel number")).toBeVisible();
    expect(within(suggestions).queryByRole("img", { name: "From search history" })).not.toBeInTheDocument();
    expect(suggestions.querySelectorAll("img")).toHaveLength(0);
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("region", { name: "Recent searches" })).toBeVisible());
  });

  it("marks exact local-history matches without reordering AS, and removes that source in private mode or after deletion", async () => {
    const history = [{ id: "weather", query: " WEATHER " }, { id: "forecast", query: "Weather   forecast" }];
    const { rerender } = render(<Search interactive initialState="input" initialQuery="Weather" history={history} />);
    await screen.findByText("channel");
    const suggestions = screen.getByRole("group", { name: "Search suggestions" });
    expect(Array.from(suggestions.children, row => row.textContent)).toEqual([
      "Weather", "Weather channel", "Weather underground", "Weather radar", "Weather forecast",
    ]);
    expect(within(suggestions).getAllByRole("img", { name: "From search history" })).toHaveLength(2);
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(3);
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(within(suggestions).queryByRole("img", { name: "From search history" })).toBeNull();
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(5);
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(within(suggestions).getAllByRole("img", { name: "From search history" })).toHaveLength(2);
    rerender(<Search interactive initialState="input" initialQuery="Weather" history={[]} />);
    expect(within(suggestions).queryByRole("img", { name: "From search history" })).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("shows five received AS rows together without a single-row loading card", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { resolveRequest = resolve; }));
    render(<Search interactive />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "12" } });
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    await act(async () => resolveRequest({ ok: true, json: async () => ["12", ["123", "1234", "120", "125", "129"]] } as Response));
    expect(screen.getByRole("group", { name: "Search suggestions" }).children).toHaveLength(5);
  });

  it("keeps one stationary home indicator while the keyboard is shown, hidden and recolored", () => {
    const { container } = render(<Search interactive initialState="keyboard" />);
    const indicator = container.querySelector("[data-ios-home-indicator]");
    expect(container.querySelectorAll("[data-ios-home-indicator]")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "iOS keyboard" }).contains(indicator)).toBe(false);
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Search query" }), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(container.querySelector("[data-ios-home-indicator]")).toBe(indicator);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search query" }));
    expect(container.querySelectorAll("[data-ios-home-indicator]")).toHaveLength(1);
    expect(container.querySelector("[data-ios-home-indicator]")).toBe(indicator);
  });

  it.each(["zero-input", "keyboard", "input"] as const)("keeps the %s key screen passive", (initialState) => {
    render(<Search initialState={initialState} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("switches InPrivate without blurring the input or replacing its keyboard", async () => {
    render(<Search initialState="keyboard" interactive />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    const keyboard = screen.getByRole("group", { name: "iOS keyboard" });
    const toggle = screen.getByRole("switch", { name: "InPrivate" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(fireEvent.pointerDown(toggle, { pointerType: "touch" })).toBe(false);
    expect(fireEvent.mouseDown(toggle)).toBe(false);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(input).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    await waitFor(() => expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible());
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Search page" })).toHaveAttribute("data-theme", "dark");

    fireEvent.change(input, { target: { value: "Weather" } });
    await screen.findByText("channel");
    expect(screen.getByRole("group", { name: "Search suggestions" })).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(input).toHaveValue("Weather");
    expect(input).toHaveFocus();
    expect(screen.getByRole("main", { name: "Search page" })).not.toHaveAttribute("data-theme");
    fireEvent.click(toggle);
    expect(input).toHaveValue("Weather");
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible());
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByRole("region", { name: "Recent searches" })).toBeVisible());
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it.each(["zero-input", "keyboard", "input"] as const)("keeps the InPrivate %s key screen passive", (initialState) => {
    render(<Search initialState={initialState} initialPrivateMode />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "InPrivate on" })).toBeVisible();
    expect(screen.getByRole("main", { name: "Search page" })).toHaveAttribute("data-private-mode", "true");
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    if (initialState === "input") expect(screen.getByRole("group", { name: "Search suggestions" })).toBeVisible();
    else expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible();
  });
});
