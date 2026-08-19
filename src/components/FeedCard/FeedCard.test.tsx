import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedCard } from "./FeedCard";

afterEach(cleanup);

describe("FeedCard", () => {
  it("renders the complete single-card default", () => {
    render(<FeedCard />);

    expect(
      screen.getByRole("article", {
        name: "Why UX Designers Are Shifting Away From Their Careers",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Two Adirondack chairs facing a quiet ocean" }),
    ).toHaveAttribute("src", expect.stringContaining("feed-card-single.jpg"));
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("adds the supplied watch and multi-card visual indicators", () => {
    const { rerender } = render(<FeedCard variant="watch" />);

    expect(
      screen.getByRole("article", {
        name: "Designing for Forgiveness: How to Create Error-Tolerant Interfaces",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Yahoo!")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-watch.jpg"),
    );

    rerender(<FeedCard variant="multi" />);
    expect(screen.getByLabelText("Slide 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-multi.jpg"),
    );
  });

  it("moves between multi-card slides with swipe and keyboard input", () => {
    render(<FeedCard variant="multi" />);

    const carousel = screen.getByRole("group", {
      name: /Slide 1 of 5/,
    });
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 280, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 120 });
    fireEvent.pointerUp(carousel, { pointerId: 1, clientX: 120 });

    expect(
      screen.getByRole("group", { name: /Slide 2 of 5/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The Quiet Design Lessons Hidden in Everyday Travel"),
    ).toBeInTheDocument();

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(
      screen.getByRole("group", { name: /Slide 3 of 5/ }),
    ).toBeInTheDocument();
  });

  it("uses the sponsored attribution for the ad card", () => {
    render(<FeedCard variant="ad" />);

    expect(screen.getByText("Ad")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("feed-card-ad.jpg"),
    );
    expect(screen.getByRole("button", { name: "Open sponsored story" })).toBeInTheDocument();
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
