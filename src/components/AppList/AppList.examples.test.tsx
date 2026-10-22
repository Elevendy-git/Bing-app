import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ListCardConfigurator } from "./AppList.examples";
import styles from "./AppList.module.css";

afterEach(cleanup);

describe("ListCardConfigurator", () => {
  it("starts with one YML card and exposes both controls", () => {
    render(<ListCardConfigurator />);
    expect(screen.getByRole("combobox", { name: "List type" })).toHaveValue("yml");
    expect(screen.getAllByRole("option")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Single list" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Multi list" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group", { name: "YML single-list card" }).children).toHaveLength(1);
  });

  it.each([
    ["YML", "yml"],
    ["Trending", "trending"],
    ["AS", "as"],
    ["AS Hub page", "as-hub-page"],
    ["Bing search history", "bing-search-history"],
    ["Copilot history", "copilot-history"],
  ])("switches %s between single and multi while retaining its type", (label, variant) => {
    render(<ListCardConfigurator />);
    const select = screen.getByRole("combobox", { name: "List type" });
    fireEvent.change(select, { target: { value: variant } });
    const single = screen.getByRole("group", { name: `${label} single-list card` });
    expect(single.children).toHaveLength(1);
    expect(single.firstElementChild).toHaveAttribute("data-variant", variant);
    expect(single.querySelector(`.${styles.dividerSlot}`)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Multi list" }));
    expect(select).toHaveValue(variant);
    expect(screen.getByRole("button", { name: "Multi list" })).toHaveAttribute("aria-pressed", "true");
    const multi = screen.getByRole("group", { name: `${label} multi-list card` });
    expect(multi.children).toHaveLength(5);
    for (const row of multi.children) expect(row).toHaveAttribute("data-variant", variant);
    expect(multi.querySelectorAll(`.${styles.dividerSlot}`)).toHaveLength(4);
    expect(multi.lastElementChild?.querySelector(`.${styles.dividerSlot}`)).toBeNull();

    // The type control remains usable in multi mode without resetting the layout.
    const alternate = variant === "trending" ? "yml" : "trending";
    fireEvent.change(select, { target: { value: alternate } });
    const alternateLabel = alternate === "yml" ? "YML" : "Trending";
    expect(screen.getByRole("group", { name: `${alternateLabel} multi-list card` }).children).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Single list" }));
    expect(select).toHaveValue(alternate);
    expect(screen.getByRole("group", { name: `${alternateLabel} single-list card` }).children).toHaveLength(1);
  });
});
