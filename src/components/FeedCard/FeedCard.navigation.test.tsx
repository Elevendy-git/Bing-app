import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedCard, type FeedCardItem } from "./FeedCard";

const slides: FeedCardItem[] = [1, 2].map(index => ({
  title: `Article ${index}`, url: `https://example.com/${index}`, imageSrc: `/${index}.jpg`,
  imageAlt: `Photo ${index}`, publisher: "Publisher", elapsedTime: "1h",
}));
afterEach(cleanup);

describe("Feed article navigation", () => {
  it("opens the supplied destination once from either image or headline", () => {
    const open = vi.fn();
    render(<FeedCard {...slides[0]} onOpenArticle={open} />);
    fireEvent.click(screen.getByRole("button", { name: "Open article image: Article 1" }));
    expect(open).toHaveBeenCalledExactlyOnceWith({ url: slides[0].url, title: slides[0].title });
    fireEvent.click(screen.getByRole("button", { name: "Article 1" }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenLastCalledWith({ url: slides[0].url, title: slides[0].title });
  });

  it("uses the current multi-card destination and keeps More/pagination separate", () => {
    const open = vi.fn(), more = vi.fn();
    render(<FeedCard variant="multi" slides={slides} onOpenArticle={open} onMoreOptions={more} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(open).not.toHaveBeenCalled();
    expect(more).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Open article image: Article 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Article 2" }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenLastCalledWith({ url: slides[1].url, title: slides[1].title });
    expect(screen.queryByRole("button", { name: "Open article image: Article 1" })).toBeNull();
  });

  it.each(["horizontal", "vertical", "diagonal-vertical", "cancelled"] as const)("does not open after a %s gesture, and accepts the next tap", gesture => {
    const open = vi.fn(), more = vi.fn();
    render(<FeedCard variant="multi" slides={slides} onOpenArticle={open} onMoreOptions={more} />);
    const image = screen.getByRole("button", { name: "Open article image: Article 1" });
    const carousel = screen.getByRole("group", { name: /Slide 1 of 2/ });
    fireEvent.pointerDown(image, { pointerId: 1, clientX: 120, clientY: 120, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: gesture === "horizontal" ? 100 : gesture === "diagonal-vertical" ? 50 : 120,
      clientY: gesture === "vertical" ? 150 : gesture === "diagonal-vertical" ? 240 : 120 });
    if (gesture === "cancelled") fireEvent.pointerCancel(carousel, { pointerId: 1 });
    else fireEvent.pointerUp(carousel, { pointerId: 1 });
    fireEvent.click(image, { detail: 1 });
    expect(open).not.toHaveBeenCalled();
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 1 of 2"));
    // A following More press must not inherit the previous swipe suppression.
    const moreButton = screen.getByRole("button", { name: "More options" });
    fireEvent.pointerDown(moreButton, { pointerId: 2, button: 0 });
    fireEvent.click(moreButton, { detail: 1 });
    expect(more).toHaveBeenCalledOnce();
    fireEvent.pointerDown(image, { pointerId: 3, clientX: 120, clientY: 120, button: 0 });
    fireEvent.pointerUp(image, { pointerId: 3 });
    fireEvent.click(image, { detail: 1 });
    expect(open).toHaveBeenCalledOnce();
  });

  it("keeps keyboard activation available after cancelling a drag", () => {
    const open = vi.fn();
    render(<FeedCard variant="multi" slides={slides} onOpenArticle={open} />);
    const image = screen.getByRole("button", { name: "Open article image: Article 1" });
    fireEvent.pointerDown(image, { pointerId: 1, clientX: 120, clientY: 120, button: 0 });
    fireEvent.pointerCancel(image, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Article 1" }), { detail: 0 });
    expect(open).toHaveBeenCalledExactlyOnceWith({ url: slides[0].url, title: slides[0].title });
  });

  it("releases a press that leaves the carousel before horizontal capture", () => {
    const open = vi.fn();
    render(<FeedCard variant="multi" slides={slides} onOpenArticle={open} />);
    const carousel = screen.getByRole("group", { name: /Slide 1 of 2/ });
    const image = screen.getByRole("button", { name: "Open article image: Article 1" });
    fireEvent.pointerDown(image, { pointerId: 1, clientX: 120, clientY: 120, button: 0 });
    fireEvent.pointerLeave(carousel, { pointerId: 1 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 10, clientY: 120 });
    fireEvent.pointerUp(carousel, { pointerId: 1 });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 1 of 2"));
    expect(open).not.toHaveBeenCalled();
  });

  it("leaves missing destinations, passive fixtures and loading cards without article actions", () => {
    const open = vi.fn();
    const { rerender } = render(<FeedCard onOpenArticle={open} />);
    expect(screen.queryByRole("button", { name: /Open article image/ })).toBeNull();
    rerender(<FeedCard {...slides[0]} />);
    expect(screen.queryByRole("button", { name: /Open article image/ })).toBeNull();
    rerender(<FeedCard variant="loading" {...slides[0]} onOpenArticle={open} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });
});
