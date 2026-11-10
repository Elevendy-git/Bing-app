import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";
import { PreviewActivityProvider } from "../components/PreviewWorkbench/PreviewActivity";
import { PREVIEW_PROTOTYPE_PAGES, PreviewPrototypeNavigationProvider, PreviewPrototypeNavigationTarget,
  usePreviewPrototypeNavigation, type PreviewPrototypePage } from "../components/PreviewWorkbench/PreviewPrototypeNavigation";

type ResultEvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
class Recognition {
  static instances: Recognition[] = [];
  lang = ""; continuous = false; interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
beforeEach(() => {
  Recognition.instances = [];
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubEnv("VITE_API_BASE_URL", "");
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost"), query = url.searchParams.get("query") ?? "";
    return { ok: true, json: async () => url.pathname === "/api/bing-serp"
      ? { query, html: `<p>Live results for ${query}</p>`, sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`,
        fetchedAt: "2026-11-10T00:00:00Z" } : [query, [query, `${query} today`]] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function Navigation() {
  const { currentPage, requestNavigation, available } = usePreviewPrototypeNavigation();
  return <nav aria-label="Workbench pages"><output aria-label="Workbench current page">{currentPage}</output>
    {PREVIEW_PROTOTYPE_PAGES.map(({ id, label }) => <button key={id} disabled={!available}
      onClick={() => requestNavigation(id)}>{label}</button>)}
  </nav>;
}
function Harness({ active = true }: { active?: boolean }) {
  return <PreviewPrototypeNavigationProvider><Navigation /><PreviewPrototypeNavigationTarget>
    <PreviewActivityProvider value={active}><BingAppPrototype initialRecentState="empty" /></PreviewActivityProvider>
  </PreviewPrototypeNavigationTarget></PreviewPrototypeNavigationProvider>;
}
function navigate(page: PreviewPrototypePage) {
  const label = PREVIEW_PROTOTYPE_PAGES.find(option => option.id === page)!.label;
  fireEvent.click(within(screen.getByRole("navigation", { name: "Workbench pages" })).getByRole("button", { name: label }));
}
const currentPage = () => screen.getByLabelText("Workbench current page").textContent;
async function submit(query: string) {
  const input = screen.getByRole("searchbox", { name: "Search query" });
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
  const frame = await screen.findByTitle(`Bing results for ${query}`);
  fireEvent.load(frame);
  return frame;
}

describe("Workbench navigation into the retained prototype", () => {
  it("keeps loaded documents and activity while opening real collection/detail pages", async () => {
    render(<Harness />);
    const home = screen.getByRole("main", { name: "Bing homepage" });
    navigate("search");
    const retainedFrame = await submit("Saved query");
    expect(currentPage()).toBe("serp");
    navigate("recent");
    await waitFor(() => expect(screen.getByRole("button", { name: "Back to search results" })).toBeVisible());
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Saved query");
    navigate("history");
    expect(screen.getByRole("main", { name: "History page" })).toHaveTextContent("Saved query");
    navigate("tabs");
    const tabs = screen.getByRole("main", { name: "Tabs page" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(1);
    fireEvent.click(within(tabs).getByRole("button", { name: "Select Saved query tab: search-1" }));
    expect(screen.getByTitle("Bing results for Saved query")).toBe(retainedFrame);
    navigate("bookmark");
    expect(screen.getByRole("main", { name: "Bookmark page" })).toBeVisible();
    navigate("home");
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBe(home);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp"))).toHaveLength(1);
  });

  it.each(["home", "recent", "tabs", "history"] as const)("opens Search through the %s entry flow and returns to that page", async origin => {
    render(<Harness />);
    navigate(origin);
    navigate("search");
    expect(currentPage()).toBe("search");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "Unsubmitted draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    expect(currentPage()).toBe(origin);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp"))).toHaveLength(0);
  });

  it("edits the retained SERP query, reports Settings, and preserves state while workbench activity is paused", async () => {
    const { rerender } = render(<Harness />);
    navigate("search");
    const retainedFrame = await submit("Retained result");
    navigate("search");
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("Retained result");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    expect(screen.getByTitle("Bing results for Retained result")).toBe(retainedFrame);
    navigate("profile");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(currentPage()).toBe("settings");
    rerender(<Harness active={false} />);
    expect(within(screen.getByRole("navigation", { name: "Workbench pages" })).getByRole("button", { name: "Home" })).toBeDisabled();
    navigate("home");
    expect(currentPage()).toBe("settings");
    rerender(<Harness />);
    navigate("history");
    expect(screen.getByRole("button", { name: "Back to Profile" })).toBeVisible();
    expect(screen.getByRole("main", { name: "History page" })).toHaveTextContent("Retained result");
  });

  it("keeps InPrivate collections behind Recent's gate instead of revealing normal activity", async () => {
    render(<Harness />);
    navigate("search");
    await submit("Public result");
    navigate("search");
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    navigate("tabs");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    expect(currentPage()).toBe("recent");
    expect(screen.getByRole("region", { name: "InPrivate activity" })).toBeVisible();
    navigate("history");
    expect(screen.queryByRole("main", { name: "History page" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Public result");
  });

  it("cancels Voice and its language sheet, ignores late recognition and suppresses old focus restoration", async () => {
    render(<Harness />);
    const microphone = screen.getByRole("button", { name: "Start voice search" });
    fireEvent.click(microphone);
    const recognition = Recognition.instances.at(-1)!;
    expect(currentPage()).toBe("voice");
    const lateResult = recognition.onresult!, lateEnd = recognition.onend!;
    fireEvent.click(screen.getByRole("button", { name: "Choose speech language" }));
    expect(currentPage()).toBe("voice-language");
    navigate("recent");
    act(() => { lateResult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Do not submit" } }] }); lateEnd(); });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Voice search" })).not.toBeInTheDocument());
    expect(currentPage()).toBe("recent");
    expect(recognition.abort).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    expect(microphone).not.toHaveFocus();
  });
});
