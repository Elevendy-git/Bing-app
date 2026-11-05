import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IOSKeyboard } from "./IOSKeyboard";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Editor() {
  const [value, setValue] = useState("");
  return <><output data-testid="value">{value}</output><IOSKeyboard value={value} onType={letter => setValue(text => text + letter)} /></>;
}
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("Interactive iOS keyboard", () => {
  it("switches numbers, the second symbol page and letters without losing typed characters", () => {
    render(<Editor />);
    press("Show numbers"); press("1"); press("2"); press("3");
    press("Show symbols"); press("["); press("€");
    press("Show numbers"); press("@"); press("Show letters"); press("a");
    expect(screen.getByTestId("value")).toHaveTextContent("123[€@a");
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toHaveAttribute("data-layout", "lowercase");
    press("Show numbers"); press("Space");
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toHaveAttribute("data-layout", "lowercase");
  });

  it("uses one uppercase letter, honors Shift inside text and locks case only on double tap", () => {
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    render(<Editor />);
    press("A"); press("b");
    press("Shift"); press("C"); press("d");
    expect(screen.getByTestId("value")).toHaveTextContent("AbCd");
    now += 1000; press("Shift"); now += 100; press("Shift");
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toHaveAttribute("data-caps-lock", "true");
    press("E"); press("F");
    now += 1000; press("Shift"); press("g");
    expect(screen.getByTestId("value")).toHaveTextContent("AbCdEFg");
    expect(screen.getByRole("button", { name: "Shift" })).toHaveAttribute("aria-pressed", "false");
  });

  it("inserts Unicode emoji from multiple categories and returns to letters", () => {
    render(<Editor />);
    press("Show emoji keyboard"); press("Insert 👍🏽");
    press("Animals & nature"); press("Insert 🌍");
    press("Show letters"); press("a");
    expect(screen.getByTestId("value")).toHaveTextContent("👍🏽🌍a");
  });

  it("uses supplied prediction values rather than quoted presentation text", () => {
    const select = vi.fn();
    render(<IOSKeyboard onType={vi.fn()} suggestions={["weather", "weather forecast", "weather today"]} onSelectSuggestion={select} />);
    const predictions = within(screen.getByRole("group", { name: "Keyboard suggestions" }));
    expect(predictions.getByRole("button", { name: "Use suggestion: weather" })).toHaveTextContent("“weather”");
    fireEvent.click(predictions.getByRole("button", { name: "Use suggestion: weather forecast" }));
    expect(select).toHaveBeenCalledExactlyOnceWith("weather forecast");
  });

  it("never invents Design predictions for an interactive keyboard", () => {
    render(<IOSKeyboard onType={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Keyboard suggestions" }).textContent).toBe("");
  });

  it("keeps all callback-free design variants passive and blocks hidden keyboard actions", () => {
    const { rerender } = render(<IOSKeyboard layout="symbols" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<IOSKeyboard layout="emoji" />);
    expect(screen.queryByRole("button")).toBeNull();
    const type = vi.fn();
    rerender(<IOSKeyboard key="interactive" onType={type} active={false} />);
    press("Show numbers"); press("A");
    expect(type).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toHaveAttribute("data-layout", "uppercase");
  });
});
