import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Homepage } from "./Homepage";
import { Search } from "./Search";
import { SERP } from "./SERP";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ["", []] }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Screen voice-entry callbacks", () => {
  it.each(["home", "search", "serp"] as const)("forwards %s's microphone without opening text search", page => {
    const voice = vi.fn(), edit = vi.fn();
    render(page === "home" ? <Homepage onVoiceSearch={voice} onOpenSearch={edit} />
      : page === "serp" ? <SERP onVoiceSearch={voice} onEditQuery={edit} />
        : <Search interactive onVoiceSearch={voice} onSubmit={edit} history={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
    expect(voice).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
  });

  it.each(["home", "serp"] as const)("leaves %s transition artwork without a voice handler", kind => {
    const voice = vi.fn();
    render(<Search interactive onVoiceSearch={voice} history={[]}
      transitionOrigin={{ kind, offsetY: 0, height: 56, insetEnd: 0, value: "" }} />);
    expect(screen.getAllByRole("button", { name: "Start voice search" })).toHaveLength(1);
    const artwork = document.querySelector('[aria-hidden="true"][inert] [role="search"], [aria-hidden="true"][inert] [data-variant="serp"]')!;
    expect(artwork).not.toBeNull();
    const artworkMic = artwork.querySelector('[aria-label="Start voice search"]');
    if (artworkMic) fireEvent.click(artworkMic);
    expect(voice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
    expect(voice).toHaveBeenCalledOnce();
  });

  it("keeps passive Search specimens without interactive voice controls", () => {
    render(<Search onVoiceSearch={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Start voice search" })).toBeNull();
  });

  it("pauses suggestions and keyboard without losing the draft or automatically focusing on resume", async () => {
    const fetcher = vi.fn((_url: string, _options: RequestInit) => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const submit = vi.fn();
    const { rerender } = render(<Search interactive initialState="keyboard" initialQuery="Weather" history={[]} onSubmit={submit} />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    expect(input).toHaveFocus();
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    const signal = fetcher.mock.calls[0][1].signal!;
    rerender(<Search interactive active={false} initialState="keyboard" initialQuery="Weather" history={[]} onSubmit={submit} />);
    expect(signal.aborted).toBe(true);
    expect(input).toHaveValue("Weather");
    expect(input).not.toHaveFocus();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).toBeNull();
    fireEvent.change(input, { target: { value: "Changed behind the modal" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("Weather");
    expect(submit).not.toHaveBeenCalled();
    rerender(<Search interactive initialState="keyboard" initialQuery="Weather" history={[]} onSubmit={submit} />);
    expect(input).toHaveValue("Weather");
    expect(input).not.toHaveFocus();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).toBeNull();
    act(() => input.focus());
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
  });
});
