import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BingSearchBox } from "./BingSearchBox";

afterEach(cleanup);

describe("BingSearchBox", () => {
  it("renders the complete default search experience", () => {
    render(<BingSearchBox />);

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search Bing" })).toHaveAttribute(
      "placeholder",
      "Ask anything",
    );
    expect(screen.getByRole("button", { name: "Start visual search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start voice search" })).toBeInTheDocument();
  });

  it("accepts copy and accessible-label overrides without adding visual states", () => {
    render(<BingSearchBox placeholder="Search the web" ariaLabel="Search the web" />);

    expect(screen.getByRole("searchbox", { name: "Search the web" })).toHaveAttribute(
      "placeholder",
      "Search the web",
    );
  });
});

