import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppSearchBoxExample } from "./AppSearchBox.examples";

afterEach(cleanup);

describe("AppSearchBox state previews", () => {
  it.each(["search", "recent"] as const)("changes %s states only through the side control", (variant) => {
    render(<AppSearchBoxExample variant={variant} />);
    const select = screen.getByRole("combobox");
    const preview = screen.getByRole("group", { name: variant === "recent" ? "Recent search box" : "Search page search box" });
    const placeholder = variant === "recent" ? "Search tabs, recents and bookmarks" : "Ask anything";

    expect(preview.closest("[inert]")).not.toBeNull();
    fireEvent.click(within(preview).getByText(placeholder));
    expect(select).toHaveValue("zero-input");
    expect(within(preview).queryByRole("searchbox")).not.toBeInTheDocument();
    expect(within(preview).queryByRole("button")).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "focus" } });
    expect(within(preview).getByText(placeholder)).toBeInTheDocument();
    fireEvent.keyDown(preview, { key: "a" });
    expect(select).toHaveValue("focus");

    fireEvent.change(select, { target: { value: "input" } });
    fireEvent.click(within(preview).getByText("Weather"));
    expect(within(preview).getByText("Weather")).toBeInTheDocument();
    expect(select).toHaveValue("input");
    expect(within(preview).queryByText(placeholder)).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "zero-input" } });
    expect(within(preview).getByText(placeholder)).toBeInTheDocument();
    expect(within(preview).queryByText("Weather")).not.toBeInTheDocument();
  });
});
