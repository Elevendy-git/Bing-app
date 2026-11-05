import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";
import { useVoiceAudioMeter } from "../hooks/useVoiceAudioMeter";
import { PreviewWorkbench } from "../components/PreviewWorkbench";
import serpStyles from "./SERP/SERP.module.css";

const motionPreference = vi.hoisted(() => ({ reducedMotion: true }));
vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => motionPreference.reducedMotion,
}));
vi.mock("../hooks/useVoiceAudioMeter", async () => {
  const { motionValue } = await import("motion/react");
  const levels = motionValue<readonly number[]>(Array<number>(12).fill(0));
  return { useVoiceAudioMeter: vi.fn(() => ({ levels })) };
});

type ResultEvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
class Recognition {
  static instances: Recognition[] = [];
  lang = ""; continuous = false; interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
const result = (transcript: string, isFinal: boolean): ResultEvent => ({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
const resultRequests = () => vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url), "http://localhost"))
  .filter(url => url.pathname === "/api/bing-serp");
const voiceDialog = () => screen.getByRole("dialog", { name: "Voice search" });
const meterEnabled = () => vi.mocked(useVoiceAudioMeter).mock.calls.at(-1)?.[0].enabled;
function openVoice() {
  fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
  return Recognition.instances.at(-1)!;
}
async function finishVoice(recognition: Recognition, query: string) {
  act(() => { recognition.onstart?.(); recognition.onresult?.(result(query, true)); recognition.onend?.(); });
  const frame = await screen.findByTitle(`Bing results for ${query}`);
  fireEvent.load(frame);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
  return frame;
}

beforeEach(() => {
  motionPreference.reducedMotion = true;
  vi.mocked(useVoiceAudioMeter).mockClear();
  Recognition.instances = [];
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost");
    const query = url.searchParams.get("query") ?? "";
    return { ok: true, json: async () => url.pathname === "/api/bing-serp"
      ? { query, html: `<p>Results for ${query}</p>`, sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`,
          fetchedAt: "2026-11-03T06:00:00Z" }
      : [query, [query]] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Voice search in the app prototype", () => {
  it("starts only from the microphone and submits once after recognition ends, creating a new Home tab each time", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    expect(Recognition.instances).toHaveLength(0);
    expect(resultRequests()).toHaveLength(0);
    const recognition = openVoice();
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(recognition.lang).toBe("en-US");
    expect(voiceDialog()).toHaveTextContent("Connecting…");
    expect(voiceDialog()).not.toHaveTextContent("I'm listening");
    act(() => recognition.onstart?.());
    expect(voiceDialog()).toHaveTextContent("I'm listening");
    act(() => recognition.onresult?.(result("Best lap", false)));
    expect(voiceDialog()).toHaveTextContent("Best lap");
    expect(resultRequests()).toHaveLength(0);
    act(() => recognition.onresult?.(result("Best laptops", true)));
    expect(voiceDialog()).toHaveTextContent("Best laptops");
    expect(resultRequests()).toHaveLength(0);
    const lateEnd = recognition.onend!;
    act(() => { lateEnd(); lateEnd(); });
    fireEvent.load(await screen.findByTitle("Bing results for Best laptops"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
    expect(resultRequests().map(url => url.searchParams.get("query"))).toEqual(["Best laptops"]);
    expect(document.querySelector('[aria-label="Search page"]')).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Edit search query" }).closest('[data-variant="serp"]'))
      .not.toHaveClass(serpStyles.searchConcealed);

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    await finishVoice(openVoice(), "Weekend weather");
    expect(document.querySelector('[aria-label="Search page"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const tabs = screen.getByRole("group", { name: "Open tabs cards" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(2);
    expect(tabs).toHaveTextContent("Best laptops");
    expect(tabs).toHaveTextContent("Weekend weather");
    const history = screen.getByRole("group", { name: "History list" });
    await waitFor(() => expect(within(history).getByRole("button", { name: "Best laptops" })).toBeVisible());
    expect(within(history).getByRole("button", { name: "Weekend weather" })).toBeVisible();
  });

  it("cancels above SERP without replacing its document, then replaces that tab on a successful voice search", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    const original = await finishVoice(openVoice(), "Weather");
    const cancel = openVoice();
    act(() => cancel.onresult?.(result("Unsubmitted forecast", false)));
    fireEvent.click(screen.getByRole("button", { name: "Close voice search" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
    expect(cancel.abort).toHaveBeenCalledOnce();
    expect(screen.getByTitle("Bing results for Weather")).toBe(original);
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("Weather");
    await waitFor(() => expect(screen.getByRole("button", { name: "Start voice search" })).toHaveFocus());
    expect(resultRequests()).toHaveLength(1);

    const replacement = await finishVoice(openVoice(), "Forecast tomorrow");
    expect(replacement).not.toBe(original);
    expect(original).not.toBeInTheDocument();
    expect(document.querySelector('[aria-label="Search page"]')).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Edit search query" }).closest('[data-variant="serp"]'))
      .not.toHaveClass(serpStyles.searchConcealed);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const tabs = screen.getByRole("group", { name: "Open tabs cards" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(1);
    expect(tabs).toHaveTextContent("Forecast tomorrow");
    const history = screen.getByRole("group", { name: "History list" });
    await waitFor(() => expect(within(history).getByRole("button", { name: "Weather" })).toBeVisible());
    expect(within(history).getByRole("button", { name: "Forecast tomorrow" })).toBeVisible();
    expect(history).not.toHaveTextContent("Unsubmitted forecast");
  });

  it.each(["close", "Escape"] as const)("%s discards final and late results, preserving Home scroll before another voice search", async method => {
    render(<BingAppPrototype initialRecentState="empty" />);
    const home = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(home, { target: { scrollTop: 555 } });
    const recognition = openVoice();
    act(() => recognition.onresult?.(result("Discarded result", true)));
    const late = { result: recognition.onresult!, end: recognition.onend! };
    if (method === "close") fireEvent.click(screen.getByRole("button", { name: "Close voice search" }));
    else fireEvent.keyDown(voiceDialog(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(screen.getByRole("region", { name: "Homepage content" })).toBe(home);
    expect(home.scrollTop).toBe(555);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start voice search" })).toHaveFocus());
    expect(resultRequests()).toHaveLength(0);
    const next = openVoice();
    act(() => { late.result(result("Late discarded result", true)); late.end(); });
    expect(voiceDialog()).toHaveTextContent("Connecting…");
    expect(resultRequests()).toHaveLength(0);
    await finishVoice(next, "Accepted result");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const history = screen.getByRole("group", { name: "History list" });
    expect(history).toHaveTextContent("Accepted result");
    expect(history).not.toHaveTextContent("Discarded result");
    expect(history).not.toHaveTextContent("Late discarded result");
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(1);
    expect(resultRequests()).toHaveLength(1);
  });

  it("keeps private voice searches out of normal activity", async () => {
    render(<BingAppPrototype initialRecentState="empty" initialPrivateMode />);
    await finishVoice(openVoice(), "Private spoken query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(await screen.findByRole("region", { name: "InPrivate activity" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(await screen.findByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "Open tabs cards" })).toBeNull();
    expect(screen.queryByRole("group", { name: "History list" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).toBeNull();
  });

  it("returns from voice to the same Search input, keyboard and private-mode choice", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const search = screen.getByRole("main", { name: "Search page" });
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    const recognition = openVoice();
    expect(screen.queryByRole("main", { name: "Search page" })).toBeNull();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).toBeNull();
    fireEvent.keyDown(voiceDialog(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
    expect(screen.getByRole("main", { name: "Search page" })).toBe(search);
    expect(screen.getByRole("searchbox", { name: "Search query" })).toBe(input);
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", "true");
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(resultRequests()).toHaveLength(0);
  });

  it("restarts recognition in the selected speech language and ignores results from the cancelled language session", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    const first = openVoice();
    const late = { result: first.onresult!, end: first.onend! };
    fireEvent.click(screen.getByRole("button", { name: "Choose speech language" }));
    const language = screen.getByRole("dialog", { name: "Speech language" });
    expect(first.abort).toHaveBeenCalledOnce();
    fireEvent.change(within(language).getByRole("searchbox", { name: "Search speech languages" }), { target: { value: "deut" } });
    fireEvent.click(within(language).getByRole("radio", { name: "Deutsch" }));
    fireEvent.click(within(language).getByRole("button", { name: "Done" }));
    const next = Recognition.instances.at(-1)!;
    expect(next).not.toBe(first);
    expect(next.lang).toBe("de-DE");
    expect(next.start).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Speech language" })).toBeNull());
    await waitFor(() => expect(voiceDialog()).toBeVisible());
    act(() => { late.result(result("Old language result", true)); late.end(); });
    expect(resultRequests()).toHaveLength(0);
    expect(voiceDialog()).toHaveTextContent("Connecting…");
    await finishVoice(next, "Wetter morgen");
    expect(resultRequests().map(url => url.searchParams.get("query"))).toEqual(["Wetter morgen"]);
    openVoice();
    fireEvent.click(screen.getByRole("button", { name: "Choose speech language" }));
    expect(within(screen.getByRole("dialog", { name: "Speech language" })).getByRole("radio", { name: "Deutsch" })).toBeChecked();
  });

  it("shows unsupported recognition explicitly and never fabricates results", async () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
    expect(voiceDialog()).toHaveTextContent("Voice search isn’t supported in this browser.");
    expect(Recognition.instances).toHaveLength(0);
    expect(resultRequests()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Close voice search" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(await screen.findByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
  });

  it("captures waveform audio only while recognition is listening, including interim and final text preview", async () => {
    motionPreference.reducedMotion = false;
    render(<BingAppPrototype initialRecentState="empty" />);
    expect(meterEnabled()).toBe(false);
    const recognition = openVoice();
    expect(meterEnabled()).toBe(false);
    act(() => recognition.onstart?.());
    expect(meterEnabled()).toBe(true);
    act(() => recognition.onresult?.(result("Weather", false)));
    expect(voiceDialog()).toHaveAttribute("data-voice-state", "input");
    expect(meterEnabled()).toBe(true);
    act(() => recognition.onresult?.(result("Weather today", true)));
    expect(meterEnabled()).toBe(true);
    act(() => recognition.onend?.());
    expect(meterEnabled()).toBe(false);
    await screen.findByTitle("Bing results for Weather today");
    await waitFor(() => expect(document.querySelector('[aria-label="Voice search"][role="dialog"]')).toBeNull());
    expect(meterEnabled()).toBe(false);
  });

  it("keeps waveform capture paused through the language sheet's exit, then resumes only the new listening session", async () => {
    motionPreference.reducedMotion = false;
    render(<BingAppPrototype initialRecentState="empty" />);
    const first = openVoice();
    act(() => first.onstart?.());
    expect(meterEnabled()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Choose speech language" }));
    expect(meterEnabled()).toBe(false);
    const language = screen.getByRole("dialog", { name: "Speech language" });
    fireEvent.click(within(language).getByRole("button", { name: "Done" }));
    const next = Recognition.instances.at(-1)!;
    expect(next).not.toBe(first);
    expect(meterEnabled()).toBe(false);
    act(() => next.onstart?.());
    // Recognition may start before the outgoing sheet releases its modal ownership.
    expect(meterEnabled()).toBe(false);
    await waitFor(() => expect(meterEnabled()).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Close voice search" }));
    expect(meterEnabled()).toBe(false);
    expect(next.abort).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.querySelector('[aria-label="Voice search"][role="dialog"]')).toBeNull());
    expect(meterEnabled()).toBe(false);
  });

  it.each(["visibilitychange", "pagehide"] as const)("stops waveform capture on %s and ignores a late recognition start", event => {
    motionPreference.reducedMotion = false;
    render(<BingAppPrototype initialRecentState="empty" />);
    const recognition = openVoice();
    const lateStart = recognition.onstart!;
    act(() => recognition.onstart?.());
    expect(meterEnabled()).toBe(true);
    if (event === "visibilitychange") vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => (event === "visibilitychange" ? document : window).dispatchEvent(new Event(event)));
    expect(meterEnabled()).toBe(false);
    expect(recognition.abort).toHaveBeenCalledOnce();
    act(() => lateStart());
    expect(meterEnabled()).toBe(false);
    expect(resultRequests()).toHaveLength(0);
  });

  it("never enables waveform capture for reduced motion", () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    const recognition = openVoice();
    act(() => recognition.onstart?.());
    expect(meterEnabled()).toBe(false);
    act(() => recognition.onerror?.({ error: "network" }));
    expect(meterEnabled()).toBe(false);
    expect(resultRequests()).toHaveLength(0);
  });

  it.each(["recognition error", "offline"] as const)("stops waveform capture on %s", reason => {
    motionPreference.reducedMotion = false;
    render(<BingAppPrototype initialRecentState="empty" />);
    const recognition = openVoice();
    act(() => recognition.onstart?.());
    expect(meterEnabled()).toBe(true);
    if (reason === "recognition error") act(() => recognition.onerror?.({ error: "network" }));
    else act(() => window.dispatchEvent(new Event("offline")));
    expect(meterEnabled()).toBe(false);
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(resultRequests()).toHaveLength(0);
  });

  it("releases speech and waveform capture when Library hides the retained prototype", async () => {
    motionPreference.reducedMotion = false;
    render(<PreviewWorkbench title="Voice" screens={[]}><BingAppPrototype initialRecentState="empty" /></PreviewWorkbench>);
    const home = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(home, { target: { scrollTop: 555 } });
    const recognition = openVoice();
    const late = { result: recognition.onresult!, end: recognition.onend! };
    act(() => recognition.onstart?.());
    expect(meterEnabled()).toBe(true);
    const library = screen.getByRole("button", { name: "Library" });
    library.focus();
    fireEvent.click(library);
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(meterEnabled()).toBe(false);
    await waitFor(() => expect(document.querySelector('[aria-label="Voice search"][role="dialog"]')).toBeNull());
    expect(library).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Prototype" }));
    expect(screen.getByRole("region", { name: "Homepage content" })).toBe(home);
    expect(home.scrollTop).toBe(555);
    expect(screen.queryByRole("dialog", { name: "Voice search" })).toBeNull();
    expect(Recognition.instances).toHaveLength(1);
    act(() => { late.result(result("Hidden result", true)); late.end(); });
    expect(resultRequests()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(await screen.findByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
  });
});
