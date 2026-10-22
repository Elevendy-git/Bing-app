import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabsCard } from "./TabsCard";
import { TabsCardOverview } from "./TabsCard.examples";

afterEach(cleanup);

describe("TabsCard", () => {
  it("keeps closing independent from selecting and leaves selection to the host", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<TabsCard onSelect={onSelect} onClose={onClose} />);
    const select = screen.getByRole("button", { name: "Select tab: Open ai" });
    fireEvent.click(select);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(select).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Close tab: Open ai" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);

    rerender(<TabsCard selected onSelect={onSelect} onClose={onClose} />);
    expect(select).toHaveAttribute("aria-pressed", "true");
    expect(select.querySelector("button")).toBeNull();
  });

  it("uses a supplied tab title and artwork, with separately named controls", () => {
    const { container } = render(<TabsCard title="A very long browser tab title"
      faviconSrc="/favicon.png" previewSrc="/preview.png"
      selectLabel="Select tab 3" closeLabel="Close tab 3" />);
    expect(screen.getByRole("button", { name: "Select tab 3" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close tab 3" })).toBeVisible();
    expect(screen.getByText("A very long browser tab title")).toHaveAttribute("title", "A very long browser tab title");
    expect([...container.querySelectorAll("img")].map((image) => image.getAttribute("src")))
      .toEqual(["/preview.png", "/favicon.png"]);
  });

  it("supports a tab without a favicon or a captured page", () => {
    const { container } = render(<TabsCard title="New tab" faviconSrc={null} previewSrc={null} />);
    expect(screen.getByRole("button", { name: "Select tab: New tab" })).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
  });

  it("changes the Library preview only from side controls and never closes it", () => {
    render(<TabsCardOverview />);
    const preview = within(screen.getByRole("group", { name: "Tabs card preview" }));
    const states = within(screen.getByRole("group", { name: "Tab state" }));
    const card = preview.getByRole("button", { name: "Select tab: Open ai" });
    expect(card.closest("[inert]")).not.toBeNull();
    expect(states.getByRole("button", { name: "Selected" }).closest("[inert]")).toBeNull();
    expect(preview.getAllByRole("article")).toHaveLength(1);
    expect(card).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(states.getByRole("button", { name: "Selected" }));
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(preview.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(states.getByRole("button", { name: "Rest" }));
    expect(card).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(states.getByRole("button", { name: "Rest" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(preview.getByRole("button", { name: "Close tab: Open ai" }));
    expect(preview.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(states.getByRole("button", { name: "Selected" }));
    fireEvent.click(preview.getByRole("button", { name: "Close tab: Open ai" }));
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(preview.getAllByRole("article")).toHaveLength(1);
    expect(preview.queryByRole("button", { name: "Restore tab" })).not.toBeInTheDocument();
  });
});
