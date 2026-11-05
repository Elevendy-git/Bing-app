import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedCard } from "./FeedCard";

afterEach(cleanup);

describe("FeedCard", () => {
  it("defers media loading by default and lets the host prioritize its first card", () => {
    const { rerender } = render(<FeedCard />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("img")).toHaveAttribute("decoding", "async");
    rerender(<FeedCard imageLoading="eager" />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    rerender(<FeedCard variant="multi" activeSlideIndex={2} imageLoading="eager" />);
    const media = Array.from(document.querySelectorAll('img[class*="image"]'));
    expect(media).toHaveLength(4);
    expect(media.map(image => image.getAttribute("loading"))).toEqual(["lazy", "lazy", "eager", "lazy"]);
    expect(media.every(image => image.getAttribute("decoding") === "async")).toBe(true);
  });

  it("honors a supplied photo focal point and omits a missing publisher mark", () => {
    const { rerender } = render(<FeedCard imagePosition="50% 12%" publisherLogoSrc={null} />);
    expect(screen.getByRole("img")).toHaveStyle({ objectPosition: "50% 12%" });
    expect(document.querySelector('span[class*="metaGroup"] svg')).toBeNull();
    rerender(<FeedCard variant="multi" slides={[{ imageSrc: "/photo.jpg", imageAlt: "Photo", imagePosition: "25% 10%",
      publisher: "Publisher", publisherLogoSrc: null, elapsedTime: "1h", title: "Story" }]} />);
    expect(screen.getByRole("img")).toHaveStyle({ objectPosition: "25% 10%" });
  });

  it("renders the complete single-card default", () => {
    render(<FeedCard />);

    expect(
      screen.getByRole("article", {
        name: "7 Quiet Beach Towns That Are Even Better After Summer Ends",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Two Adirondack chairs facing a quiet ocean" }),
    ).toHaveAttribute("src", expect.stringContaining("feed-card-single.jpg"));
    expect(screen.getByText("Travel + Leisure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("adds the supplied watch and multi-card visual indicators", () => {
    const { rerender } = render(<FeedCard variant="watch" />);

    expect(
      screen.getByRole("article", {
        name: "Watch: A Rare Dawn Chorus Returns to the Restored Rainforest",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("BBC Earth")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-watch.jpg"),
    );

    rerender(<FeedCard variant="multi" />);
    expect(screen.getByLabelText("Slide 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-single.jpg"),
    );
  });

  it("uses a supplied publisher logo URL", () => {
    render(
      <FeedCard
        publisher="MSN"
        publisherLogoSrc="https://example.com/msn-logo.png"
      />,
    );

    expect(document.querySelector('img[src="https://example.com/msn-logo.png"]')).toHaveAttribute(
      "alt",
      "",
    );
    expect(screen.getByText("MSN")).toBeInTheDocument();
  });

  it("moves between multi-card slides with swipe and keyboard input", () => {
    render(<FeedCard variant="multi" />);

    const carousel = screen.getByRole("group", {
      name: /Slide 1 of 4/,
    });
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 280, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 120 });
    fireEvent.pointerUp(carousel, { pointerId: 1, clientX: 120 });

    expect(
      screen.getByRole("group", { name: /Slide 2 of 4/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The Rainforest Corridor Bringing Wildlife Back to the River"),
    ).toBeInTheDocument();

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(
      screen.getByRole("group", { name: /Slide 3 of 4/ }),
    ).toBeInTheDocument();
  });

  it("renders supplied multi-card slide data", () => {
    render(
      <FeedCard
        variant="multi"
        slides={[
          {
            imageSrc: "/one.jpg",
            imageAlt: "First mock image",
            publisher: "MSN One",
            elapsedTime: "5m",
            title: "First MSN mock story",
          },
          {
            imageSrc: "/two.jpg",
            imageAlt: "Second mock image",
            publisher: "MSN Two",
            elapsedTime: "8m",
            title: "Second MSN mock story",
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Slide 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("First MSN mock story")).toBeInTheDocument();
    expect(screen.getByText("Second MSN mock story")).toBeInTheDocument();
  });

  it("allows a host to control the active slide and bounds it when data shrinks", () => {
    const onActiveSlideChange = vi.fn();
    const { rerender } = render(<FeedCard variant="multi" activeSlideIndex={1} onActiveSlideChange={onActiveSlideChange} />);
    const carousel = screen.getByRole("group", { name: /Slide 2 of 4/ });
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(onActiveSlideChange).toHaveBeenCalledWith(2);
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 2 of 4"));
    rerender(<FeedCard variant="multi" activeSlideIndex={2} />);
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 3 of 4"));
    rerender(<FeedCard variant="multi" activeSlideIndex={2} slides={[{
      imageSrc: "/one.jpg", imageAlt: "One", publisher: "MSN", elapsedTime: "5m", title: "Only remaining story",
    }]} />);
    expect(carousel).toHaveAccessibleName("Slide 1 of 1: Only remaining story");
  });

  it("uses the sponsored attribution for the ad card", () => {
    render(<FeedCard variant="ad" />);

    expect(screen.getByText("Ad")).toBeInTheDocument();
    expect(screen.getByText("POP MART")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-ad.jpg"),
    );
    expect(screen.getByRole("button", { name: "Open sponsored story" })).toBeInTheDocument();
  });

  it("opens options for the active slide's publisher or explicit topic", () => {
    const onMoreOptions = vi.fn();
    const topic = { kind: "topic", name: "FIFA World Cup" } as const;
    render(<FeedCard variant="multi" onMoreOptions={onMoreOptions} slides={[
      { publisher: "First publisher", title: "Story one", imageSrc: "/one.jpg", imageAlt: "", elapsedTime: "1h" },
      { publisher: "Second publisher", title: "Story two", imageSrc: "/two.jpg", imageAlt: "", elapsedTime: "2h", followTarget: topic },
    ]} />);
    const first = screen.getByRole("button", { name: "More options" });
    fireEvent.click(first);
    expect(onMoreOptions).toHaveBeenLastCalledWith({ kind: "publisher", name: "First publisher" }, first);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    const second = screen.getByRole("button", { name: "More options" });
    fireEvent.click(second);
    expect(onMoreOptions).toHaveBeenLastCalledWith(topic, second);
    expect(first.closest('[aria-hidden="true"]')).toHaveAttribute("inert");
  });

  it("exposes the loading card as busy without rendering article content", () => {
    render(<FeedCard variant="loading" />);

    expect(screen.getByRole("article", { name: "Loading feed card" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
