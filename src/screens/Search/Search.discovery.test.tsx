import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Search } from "./Search";
import { useSearchDiscovery } from "./useSearchDiscovery";
import type { DiscoveryPage } from "../../services/searchDiscovery";

const recommendations: DiscoveryPage = { section: "recommendations", source: "msn", fetchedAt: "2026-10-21T09:00:00Z",
  items: ["one", "two", "three"].map(id => ({ id, title: `Live story ${id}`, imageSrc: `https://bing.com/${id}.jpg`, url: `https://www.msn.com/${id}` })),
};
const trending: DiscoveryPage = { section: "trending", source: "google-trends", fetchedAt: recommendations.fetchedAt, items: [] };
const reply = (data: DiscoveryPage) => ({ ok: true, json: async () => data }) as Response;
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (url: string) => reply(url.includes("recommendations") ? recommendations : trending))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function LiveSearch({ enabled = true, interactive = false }: { enabled?: boolean; interactive?: boolean }) {
  const discovery = useSearchDiscovery(enabled);
  return <Search history={[]} discovery={discovery} interactive={interactive} />;
}

describe("Search discovery", () => {
  it("renders MSN rows in existing cards and handles an empty trending response", async () => {
    render(<LiveSearch />);
    expect(screen.getByRole("status", { name: "Loading You might like" })).toBeVisible();
    expect(await screen.findByText("Live story one")).toBeVisible();
    const card = screen.getByRole("group", { name: "You might like" });
    expect(card.querySelectorAll('[data-variant="yml"]')).toHaveLength(3);
    expect(card.querySelectorAll("img")).toHaveLength(3);
    expect(card.parentElement).toHaveAttribute("data-source", "msn");
    expect(await screen.findByText("Trending searches aren’t available right now.")).toBeVisible();
    expect(screen.queryByText("Sharks at Capitals")).not.toBeInTheDocument();
    expect(screen.queryByText("World Athletics Launches Biennial Event")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Live story one" })).not.toBeInTheDocument();
    const image = card.querySelector("img")!;
    fireEvent.error(image);
    expect(card.querySelectorAll("img")).toHaveLength(2);
  });

  it("renders six readable related headlines with images in the existing passive trend rows", async () => {
    const items = Array.from({ length: 6 }, (_, index) => ({ id: `trend-${index}`, title: `Trend ${index + 1}`,
      headline: `Team ${index + 1} advances to the championship final`,
      imageSrc: `https://encrypted-tbn0.gstatic.com/images?q=tbn:${index}`, url: "https://trends.google.com/trending/rss?geo=US" }));
    vi.mocked(fetch).mockImplementation(async url => reply(String(url).includes("recommendations") ? recommendations : { ...trending, items }));
    render(<LiveSearch />);
    await screen.findByText("Team 6 advances to the championship final");
    const card = screen.getByRole("group", { name: "What’s trending" });
    expect(card.querySelectorAll('[data-variant="trending"]')).toHaveLength(6);
    expect(within(card).getByLabelText("Rank 6")).toBeVisible();
    expect(card.querySelectorAll("img")).toHaveLength(6);
    expect(card.querySelector("img")).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(card.parentElement).toHaveAttribute("data-source", "google-trends");
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Trending searches aren’t available right now.")).not.toBeInTheDocument();
    fireEvent.error(card.querySelector("img")!);
    expect(card.querySelectorAll("img")).toHaveLength(5);
    expect(within(card).getByText("Team 1 advances to the championship final")).toBeVisible();
    expect(within(card).queryByText("Trend 1")).not.toBeInTheDocument();
  });

  it("shows only provider trend order, uses supplied images and hides absent thumbnails", async () => {
    vi.mocked(fetch).mockImplementation(async url => reply(String(url).includes("recommendations") ? recommendations : {
      ...trending, items: [{ ...recommendations.items[0], title: "First topic" }, { ...recommendations.items[1], title: "Second topic", imageSrc: null }],
    }));
    render(<LiveSearch />);
    await screen.findByText("First topic");
    const card = screen.getByRole("group", { name: "What’s trending" });
    expect(within(card).getByLabelText("Rank 1")).toBeVisible();
    expect(within(card).getByLabelText("Rank 2")).toBeVisible();
    expect(card.querySelectorAll("img")).toHaveLength(1);
    expect(card.parentElement).toHaveAttribute("data-source", "google-trends");
  });

  it("retries a failed section without refetching or replacing the successful section", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => { throw new Error("offline"); });
    render(<LiveSearch />);
    expect(await screen.findByText("Recommendations couldn’t load.")).toBeVisible();
    fireEvent.click(within(screen.getByRole("group", { name: "You might like" })).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Live story one")).toBeVisible();
    expect(vi.mocked(fetch).mock.calls.filter(call => String(call[0]).includes("trending"))).toHaveLength(1);
  });

  it("does not request discovery while disabled, aborts when leaving and ignores late responses", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { rerender, unmount } = render(<LiveSearch enabled={false} />);
    expect(fetch).not.toHaveBeenCalled();
    rerender(<LiveSearch />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve(reply(recommendations)));
    expect(screen.queryByText("Live story one")).not.toBeInTheDocument();
  });

  it("retains offline design fixtures when Search is previewed without live discovery", () => {
    render(<Search />);
    expect(screen.getByText("World Athletics Launches Biennial Event")).toBeVisible();
    expect(screen.getAllByText("Sharks at Capitals")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^(Hide|Show) (You might like|What’s trending)$/ })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("independently hides and restores section content, retaining headers and loaded data without a refetch", async () => {
    render(<LiveSearch interactive />);
    await screen.findByText("Live story one");
    const card = screen.getByRole("group", { name: "You might like" });
    const image = card.querySelector("img");
    const eye = screen.getByRole("button", { name: "Hide You might like" });
    const content = document.getElementById(eye.getAttribute("aria-controls")!)!;
    fireEvent.click(screen.getByRole("heading", { name: "You might like" }));
    expect(eye).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(eye);
    expect(screen.getByRole("button", { name: "Show You might like" })).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("aria-hidden", "true");
    expect(content).toHaveAttribute("inert");
    expect(screen.queryByRole("group", { name: "You might like" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You might like" })).toBeVisible();
    expect(screen.getByRole("group", { name: "What’s trending" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hide What’s trending" }));
    expect(screen.queryByRole("group", { name: "What’s trending" })).not.toBeInTheDocument();
    // Hidden retry controls must also be removed from keyboard/accessibility navigation.
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show You might like" }));
    expect(screen.getByRole("group", { name: "You might like" })).toBe(card);
    expect(card.querySelector("img")).toBe(image);
    expect(content).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Show What’s trending" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Show What’s trending" }));
    expect(screen.getByRole("group", { name: "What’s trending" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps section preferences after typing, clearing and switching Private mode", () => {
    render(<Search interactive initialState="keyboard" />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    const eye = screen.getByRole("button", { name: "Hide You might like" });
    expect(fireEvent.mouseDown(eye)).toBe(false);
    fireEvent.click(eye);
    expect(input).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.change(input, { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(screen.getByRole("button", { name: "Show You might like" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(screen.getByRole("button", { name: "Show You might like" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Hide What’s trending" })).toHaveAttribute("aria-expanded", "true");
  });
});
