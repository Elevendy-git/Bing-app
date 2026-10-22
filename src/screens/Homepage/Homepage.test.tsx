import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Homepage } from "./Homepage";
import searchStyles from "../../components/BingSearchBox/BingSearchBox.module.css";

const scrollTopDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop")!;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(Element.prototype, "scrollTop", scrollTopDescriptor);
});

describe("Homepage scrolling", () => {
  it("waits for a hidden dialog to become scrollable before restoring its preview position", () => {
    let visible = false;
    const offsets = new WeakMap<Element, number>();
    Object.defineProperty(Element.prototype, "scrollTop", {
      configurable: true,
      get(this: Element) { return offsets.get(this) ?? 0; },
      set(this: Element, value: number) { offsets.set(this, visible ? value : 0); },
    });
    let resize: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resize = callback; }
      observe() {}
      disconnect = disconnect;
    });
    render(<Homepage initialState="scrolled" />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    expect(content.scrollTop).toBe(0);
    visible = true;
    act(() => resize());
    expect(content.scrollTop).toBe(384);
    expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("keeps the same search input, glance cards and footer state when scrolling down and back", () => {
    render(<Homepage />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    const input = screen.getByRole("searchbox", { name: "Search Bing" });
    const glanceGroup = screen.getByRole("group", { name: "Glance cards" });
    const glanceCards = within(glanceGroup).getAllByRole("button");
    expect(glanceCards.map(card => card.dataset.glanceCard)).toEqual(["rewards", "sports", "create", "money"]);
    fireEvent.scroll(glanceGroup, { target: { scrollLeft: 100 } });
    fireEvent.change(input, { target: { value: "weekend ideas" } });
    fireEvent.click(screen.getByRole("button", { name: "Collections" }));

    fireEvent.scroll(content, { target: { scrollTop: 384 } });
    expect(screen.getByRole("searchbox")).toBe(input);
    expect(input).toHaveValue("weekend ideas");
    expect(input).toHaveAttribute("placeholder", "Ask anything");
    expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
    within(glanceGroup).getAllByRole("button").forEach((card, index) => expect(card).toBe(glanceCards[index]));
    expect(within(glanceGroup).getAllByRole("button")).toHaveLength(4);
    expect(glanceGroup.scrollLeft).toBe(100);
    expect(screen.getByRole("button", { name: "Collections" })).toHaveAttribute("aria-current", "page");

    fireEvent.scroll(content, { target: { scrollTop: 0 } });
    expect(input).toHaveValue("weekend ideas");
    expect(input).toHaveAttribute("placeholder", "Ask anything");
    expect(screen.getByRole("search")).not.toHaveClass(searchStyles.compact);
    within(glanceGroup).getAllByRole("button").forEach((card, index) => expect(card).toBe(glanceCards[index]));
    expect(within(glanceGroup).getAllByRole("button")).toHaveLength(4);
    expect(glanceGroup.scrollLeft).toBe(100);
  });

  it("starts the scrolled key screen at the design position and allows returning to the hero", () => {
    render(<Homepage initialState="scrolled" />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    expect(content.scrollTop).toBe(384);
    expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
    expect(within(screen.getByRole("group", { name: "Glance cards" })).getAllByRole("button")
      .map(card => card.dataset.glanceCard)).toEqual(["rewards", "sports", "create", "money"]);
    fireEvent.scroll(content, { target: { scrollTop: 0 } });
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Ask anything");
    expect(screen.getByRole("search")).not.toHaveClass(searchStyles.compact);
  });

  it("collapses only when search reaches its sticky position", () => {
    render(<Homepage />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(content, { target: { scrollTop: 331 } });
    expect(screen.getByRole("search")).not.toHaveClass(searchStyles.compact);
    fireEvent.scroll(content, { target: { scrollTop: 332 } });
    expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
    fireEvent.scroll(screen.getByRole("group", { name: "Glance cards" }), { target: { scrollLeft: 120 } });
    expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
  });

  it("shrinks continuously before docking without re-rendering the feed on each scroll frame", () => {
    const onRender = vi.fn();
    render(<Profiler id="homepage" onRender={onRender}><Homepage /></Profiler>);
    const content = screen.getByRole("region", { name: "Homepage content" });
    const slot = screen.getByRole("search").parentElement!;
    onRender.mockClear();
    for (const [position, height] of [[120, 64], [236, 64], [260, 62.75], [284, 60], [308, 57.25]]) {
      fireEvent.scroll(content, { target: { scrollTop: position } });
      expect(slot).toHaveStyle({ transform: `translateY(${332 - position}px)` });
      expect(slot.style.getPropertyValue("--gnrc-homepage-composer-height")).toBe(`${height}px`);
    }
    expect(onRender).not.toHaveBeenCalled();
    fireEvent.scroll(content, { target: { scrollTop: 332 } });
    expect(slot.style.getPropertyValue("--gnrc-homepage-composer-height")).toBe("56px");
    expect(onRender).toHaveBeenCalledOnce();
    fireEvent.scroll(content, { target: { scrollTop: 555 } });
    expect(slot.style.getPropertyValue("--gnrc-homepage-composer-height")).toBe("56px");
    expect(onRender).toHaveBeenCalledOnce();
    fireEvent.scroll(content, { target: { scrollTop: 284 } });
    expect(slot.style.getPropertyValue("--gnrc-homepage-composer-height")).toBe("60px");
    fireEvent.scroll(content, { target: { scrollTop: 0 } });
    expect(slot.style.getPropertyValue("--gnrc-homepage-composer-height")).toBe("64px");
  });

  it("keeps search outside the scrolling surface and pinned through bottom overscroll", () => {
    render(<Homepage initialState="scrolled" />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    const input = screen.getByRole("searchbox");
    const header = screen.getByRole("search").parentElement;
    expect(content).not.toContainElement(input);
    fireEvent.change(input, { target: { value: "weekend ideas" } });

    for (const scrollTop of [1486, 1560, 1490, 1486]) {
      fireEvent.scroll(content, { target: { scrollTop } });
      expect(header).toHaveStyle({ transform: "translateY(0px)" });
      expect(screen.getByRole("search")).toHaveClass(searchStyles.compact);
      expect(input).toHaveValue("weekend ideas");
    }
    fireEvent.scroll(content, { target: { scrollTop: -60 } });
    expect(header).toHaveStyle({ transform: "translateY(332px)" });
    expect(input).toHaveAttribute("placeholder", "Ask anything");
  });

  it("scrolls the feed under the header without moving the pinned search", () => {
    render(<Homepage />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(content, { target: { scrollTop: 555 } });
    expect(content.scrollTop).toBe(555);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(0px)" });
  });
});
