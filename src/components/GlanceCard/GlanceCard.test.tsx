import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlanceCard } from "./GlanceCard";
import { GlanceCardGroup } from "./GlanceCardGroup";

afterEach(cleanup);

describe("Glance Card", () => {
  it("exposes current game data and preserves native button activation", () => {
    const onClick = vi.fn();
    render(<GlanceCard variant="sports" sports={{ matchup: "SEA vs NYJ", date: "Sun, 18 Oct", time: "4:00 PM" }} onClick={onClick} />);
    const card = screen.getByRole("button", { name: "SEA vs NYJ Next Sun, 18 Oct 4:00 PM" });
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
    expect(card).toHaveAttribute("type", "button");
    expect(screen.queryByText("Sat, 16 Jul")).not.toBeInTheDocument();
  });

  it("lets disabled cards remain visible without triggering an action", () => {
    const onCardClick = vi.fn();
    render(<GlanceCardGroup items={[{ id: "balance", variant: "rewards", value: "72 / 90", disabled: true }]} onCardClick={onCardClick} />);
    const card = screen.getByRole("button", { name: "Rewards 72 / 90" });
    fireEvent.click(card);
    expect(card).toBeDisabled();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("updates the sports lifecycle without leaking the previous state's content", () => {
    const onClick = vi.fn();
    const { rerender } = render(<GlanceCard variant="sports" />);
    expect(screen.getByText("Sat, 16 Jul")).toBeVisible();

    rerender(<GlanceCard variant="sports" sportsState="live" sports={{ score: "14 - 10", period: "Q2 01:45" }} />);
    expect(screen.getByRole("button", { name: "NEP vs NYJ Live 14 - 10 Q2 01:45" })).toBeVisible();
    expect(screen.getByText("14 - 10")).toBeVisible();
    expect(screen.getByText("Q2 01:45")).toBeVisible();
    expect(screen.queryByText("Sat, 16 Jul")).not.toBeInTheDocument();

    rerender(<GlanceCard variant="sports" sportsState="final" />);
    expect(screen.getByRole("button", { name: "NEP vs NYJ Final 28 - 24" })).toBeVisible();
    expect(screen.getByText("28 - 24")).toBeVisible();
    expect(screen.queryByText("Q2 01:45")).not.toBeInTheDocument();

    rerender(<GlanceCard variant="sports" sportsState="cold-start" onClick={onClick} />);
    const card = screen.getByRole("button", { name: "Sports Follow your favorite team" });
    expect(screen.getByText("Follow your favorite team")).toBeVisible();
    expect(screen.queryByText("NEP vs NYJ")).not.toBeInTheDocument();
    expect(screen.queryByText("28 - 24")).not.toBeInTheDocument();
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("navigates the whole shelf with arrow and boundary keys, skipping disabled cards", () => {
    render(<GlanceCardGroup items={[
      { id: "rewards", variant: "rewards" },
      { id: "sports", variant: "sports", disabled: true },
      { id: "create", variant: "create" },
      { id: "settings", variant: "settings" },
    ]} />);
    const [rewards, , create, settings] = within(screen.getByRole("group")).getAllByRole("button");
    rewards.focus();
    fireEvent.keyDown(rewards, { key: "ArrowRight" });
    expect(create).toHaveFocus();
    fireEvent.keyDown(create, { key: "End" });
    expect(settings).toHaveFocus();
    fireEvent.keyDown(settings, { key: "ArrowRight" });
    expect(settings).toHaveFocus();
    fireEvent.keyDown(settings, { key: "Home" });
    expect(rewards).toHaveFocus();
    fireEvent.keyDown(rewards, { key: "ArrowLeft" });
    expect(rewards).toHaveFocus();
  });

  it("reports stable item IDs and allows item handlers to cancel a group action", () => {
    const onCardClick = vi.fn();
    const onClick = vi.fn((event) => event.preventDefault());
    render(<GlanceCardGroup items={[
      { id: "my-balance", variant: "rewards", onClick },
      { id: "preferences", variant: "settings" },
    ]} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Rewards 45 / 90" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Settings Manage glance cards" }));
    expect(onCardClick).toHaveBeenCalledExactlyOnceWith("preferences");
  });
});
