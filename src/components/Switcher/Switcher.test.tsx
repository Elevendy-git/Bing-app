import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SwitcherOverview } from "./Switcher.examples";

afterEach(cleanup);

describe("Switcher Library overview", () => {
  it("toggles the single overview switch directly without a side panel", () => {
    render(<SwitcherOverview />);
    const preview = within(screen.getByRole("group", { name: "Switcher preview" }));
    const toggle = preview.getByRole("switch", { name: "Switcher" });
    expect(preview.getAllByRole("switch")).toHaveLength(1);
    expect(toggle.closest("[inert]")).toBeNull();
    expect(screen.queryByRole("group", { name: "Switcher controls" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });
});
