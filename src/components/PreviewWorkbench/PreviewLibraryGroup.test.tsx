import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { previewComponentGroups } from "../../previewCatalog";
import { PreviewLibraryGroup } from "./PreviewLibraryGroup";

afterEach(cleanup);

describe("Library preview interaction boundaries", () => {
  it("keeps artwork inert except the authorized Footer, Multi-cards and Switcher overview interactions", () => {
    const { container } = render(<>{previewComponentGroups.map((group) => (
      <PreviewLibraryGroup key={group.id} group={group} theme="light" showTitle />
    ))}</>);
    const controls = screen.getAllByRole("group", { name: /controls$/ });
    const interactiveArtwork = [
      screen.getByRole("navigation", { name: "Bing app navigation" }),
      screen.getByRole("navigation", { name: "IAB footer navigation" }),
      screen.getByRole("button", { name: "Go to slide 1" }).closest("article")!,
      screen.getByRole("group", { name: "Switcher preview" }),
    ];
    const inputs = [...container.querySelectorAll("button, input, select, a[href], [tabindex]")];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      const allowsInput = !input.closest('[aria-hidden="true"]')
        && [...controls, ...interactiveArtwork].some((panel) => panel.contains(input));
      if (allowsInput) expect(input.closest("[inert]")).toBeNull();
      else expect(input.closest("[inert]")).not.toBeNull();
    }
  });

  it("switches the footer by clicking its destinations without a side control", () => {
    render(<PreviewLibraryGroup group={previewComponentGroups.find((group) => group.id === "footer")!}
      theme="light" showTitle />);
    expect(screen.queryByRole("group", { name: "Footer controls" })).not.toBeInTheDocument();
    const footer = within(screen.getByRole("navigation", { name: "Bing app navigation" }));
    const home = footer.getByRole("button", { name: "Home" });
    const collections = footer.getByRole("button", { name: "Collections" });
    fireEvent.click(collections);
    expect(collections).toHaveAttribute("aria-current", "page");
    expect(home).not.toHaveAttribute("aria-current");
    fireEvent.click(home);
    expect(home).toHaveAttribute("aria-current", "page");
    expect(collections).not.toHaveAttribute("aria-current");
  });

  it("switches Multi-cards with pagination, keyboard and drag instead of a side control", async () => {
    render(<PreviewLibraryGroup group={previewComponentGroups.find((group) => group.id === "feed-card")!}
      theme="light" showTitle />);
    const carousel = screen.getByRole("group", { name: /^Slide 1 of/ });
    expect(screen.queryByRole("combobox", { name: "Slide" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 2 of"));
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 3 of"));
    // Start the next gesture on the landed page; interruption is covered separately.
    await waitFor(() => expect(carousel.firstElementChild).toHaveStyle({ transform: "translateX(-660px)" }));
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 280, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 120 });
    fireEvent.pointerUp(carousel, { pointerId: 1, clientX: 120 });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 4 of"));
  });

  it("previews IAB footer states with direct interaction without an iOS home indicator", () => {
    render(<PreviewLibraryGroup group={previewComponentGroups.find((group) => group.id === "footer")!}
      theme="light" showTitle />);
    const footer = screen.getByRole("navigation", { name: "IAB footer navigation" });
    const recent = within(footer).getByRole("button", { name: "Recent" });
    expect(recent).toHaveAttribute("aria-current", "page");
    expect(recent.querySelector("svg")).toHaveAttribute("data-icon-variant", "filled");
    fireEvent.click(within(footer).getByRole("button", { name: "Back" }));
    expect(recent).not.toHaveAttribute("aria-current");
    expect(recent.querySelector("svg")).toHaveAttribute("data-icon-variant", "regular");
    fireEvent.click(recent);
    expect(recent).toHaveAttribute("aria-current", "page");
    fireEvent.click(within(footer).getByRole("button", { name: "Home" }));
    expect(recent).not.toHaveAttribute("aria-current");
    expect(footer.parentElement?.querySelectorAll("[data-ios-home-indicator]")).toHaveLength(0);
  });
});
