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
  it("moves between zero input, keyboard and live suggestions without inventing a result page", async () => {
    render(<Search interactive />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.change(input, { target: { value: "Weather" } });
    expect(await screen.findByText("channel")).toBeVisible();
    const suggestions = screen.getByRole("group", { name: "Search suggestions" });
    expect(suggestions.children).toHaveLength(5);
    expect(within(suggestions).queryByRole("img", { name: "From search history" })).not.toBeInTheDocument();
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(5);
    expect(suggestions.querySelectorAll("img")).toHaveLength(0);
    expect(within(suggestions).getByText("forecast")).toBeVisible();
    expect(suggestions.parentElement).toHaveAttribute("data-suggestions-source", "live");
    expect(within(suggestions).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("main", { name: "Search page" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(input).toHaveValue("");
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
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
    fireEvent.click(screen.getByRole("button", { name: "E" }));
    expect(input).toHaveValue("We");
    fireEvent.click(screen.getByRole("button", { name: "Delete character" }));
    expect(input).toHaveValue("W");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "unrelated query" } });
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    fireEvent.wheel(screen.getByRole("region", { name: "Search content" }));
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(input).toHaveValue("unrelated query");
    // Refocusing can reverse an in-flight dismissal without replacing the keyboard or query.
    fireEvent.focus(input);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    expect(input).toHaveValue("unrelated query");
  });

  it("shows five live numeric suggestions and restores discovery for whitespace-only input", async () => {
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
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
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
    expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "You might like" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBe(keyboard);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it.each(["zero-input", "keyboard", "input"] as const)("keeps the InPrivate %s key screen passive", (initialState) => {
    render(<Search initialState={initialState} initialPrivateMode />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "InPrivate on" })).toBeVisible();
    expect(screen.getByRole("main", { name: "Search page" })).toHaveAttribute("data-private-mode", "true");
    expect(screen.queryByRole("group", { name: "You might like" })).not.toBeInTheDocument();
    if (initialState === "input") expect(screen.getByRole("group", { name: "Search suggestions" })).toBeVisible();
    else expect(screen.getByRole("region", { name: "InPrivate Search" })).toBeVisible();
  });
});
