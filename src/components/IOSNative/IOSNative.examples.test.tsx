import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IOSKeyboardOverview } from "./IOSNative.examples";

afterEach(cleanup);

describe("iOS native Library", () => {
  it("changes keyboard variants through the controls while keeping the artwork passive", () => {
    render(<IOSKeyboardOverview />);
    const keyboard = screen.getByRole("group", { name: "iOS keyboard" });
    const controls = within(screen.getByRole("group", { name: "iOS Keyboard controls" }));
    expect(keyboard.closest("[inert]")).not.toBeNull();
    expect(within(keyboard).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(within(keyboard).getByText("Q"));
    expect(controls.getByLabelText("Keyboard type")).toHaveValue("uppercase");

    fireEvent.change(controls.getByLabelText("Keyboard type"), { target: { value: "lowercase" } });
    expect(within(keyboard).getByText("q")).toBeInTheDocument();
    expect(within(keyboard).queryByText("Q")).not.toBeInTheDocument();
    fireEvent.change(controls.getByLabelText("Keyboard type"), { target: { value: "numeric" } });
    expect(within(keyboard).getByText("1")).toBeInTheDocument();
    expect(within(keyboard).getByText("ABC")).toBeInTheDocument();

    fireEvent.change(controls.getByLabelText("Return key"), { target: { value: "search" } });
    expect(within(keyboard).getByText("search")).toBeInTheDocument();
    fireEvent.change(controls.getByLabelText("Suggestions"), { target: { value: "false" } });
    expect(within(keyboard).queryByText("Designs")).not.toBeInTheDocument();
    fireEvent.change(controls.getByLabelText("Suggestions"), { target: { value: "true" } });
    expect(within(keyboard).getByText("Designs")).toBeInTheDocument();
    expect(within(keyboard).queryByRole("button")).not.toBeInTheDocument();
  });
});
