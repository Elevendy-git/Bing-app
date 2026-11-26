import { Star24Filled, Star24Regular } from "@fluentui/react-icons";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { previewKeyScreens } from "../../keyScreenCatalog";
import searchStyles from "../../components/AppSearchBox/AppSearchBox.module.css";
import { SERPKeyScreen, type SERPKeyScreenState } from "./SERP.examples";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Key screens must not request live content")));
  vi.spyOn(window, "open").mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function focusWorkbenchControl() {
  render(<button type="button">Workbench control</button>);
  const control = screen.getByRole("button", { name: "Workbench control" });
  control.focus();
  return control;
}

describe("IAB Key screen specimens", () => {
  it("renders every registered IAB specimen without live requests or stealing workbench focus", async () => {
    const control = focusWorkbenchControl();
    const iabScreens = previewKeyScreens.filter(item => item.group === "IAB");
    render(<>{iabScreens.map(item => <div key={item.id}>{item.content}</div>)}</>);
    await act(async () => { await Promise.resolve(); });
    expect(control).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it.each([
    ["webpage", Star24Regular],
    ["webpage-bookmarked", Star24Filled],
  ] as const)("uses the passive bookmark star in %s instead of the SERP microphone", (state, Star) => {
    render(<><SERPKeyScreen state={state} /><span data-testid="expected-star"><Star /></span></>);
    const composer = screen.getByRole("group", { name: "Webpage address" });
    expect(composer).toHaveTextContent("https://openai.com/");
    expect(composer.querySelector("svg path")?.getAttribute("d")).toBe(screen.getByTestId("expected-star").querySelector("path")?.getAttribute("d"));
    expect(composer.querySelector(`.${searchStyles.microphone}`)).toBeNull();
    expect(within(composer).queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    ["serp-loading", "serp-private", "Bing results", "Bing weather results — Figma design reference"],
    ["webpage-loading", "webpage", "Web page", "OpenAI webpage — existing design reference"],
  ] as const)("shows an empty viewport with static progress for %s, then the reference when idle", (loading, idle, viewportLabel, referenceLabel) => {
    const { rerender } = render(<SERPKeyScreen state={loading} />);
    const viewport = screen.getByRole("region", { name: viewportLabel });
    expect(viewport).toBeEmptyDOMElement();
    expect(viewport).toHaveAttribute("aria-busy", "true");
    const progress = screen.getByRole("progressbar", { name: "Loading search results" });
    expect(progress.firstElementChild).toHaveStyle({ transform: "scaleX(0.36)" });
    expect(screen.queryByRole("img", { name: referenceLabel })).not.toBeInTheDocument();
    rerender(<SERPKeyScreen state={idle} />);
    expect(viewport).toHaveAttribute("aria-busy", "false");
    expect(within(viewport).getByRole("img", { name: referenceLabel })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["serp-menu", "Search results options", true],
    ["webpage-menu", "Webpage options", false],
  ] satisfies readonly [SERPKeyScreenState, string, boolean][])("keeps %s passive and preserves the Search settings difference", (state, label, hasSearchSettings) => {
    const control = focusWorkbenchControl();
    render(<SERPKeyScreen state={state} />);
    const dialog = screen.getByRole("dialog", { name: label });
    expect(dialog).not.toHaveAttribute("aria-modal", "true");
    expect(Boolean(within(dialog).queryByRole("menuitem", { name: "Search settings" }))).toBe(hasSearchSettings);
    for (const item of within(dialog).getAllByRole("menuitem")) {
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).toHaveAttribute("tabindex", "-1");
      fireEvent.click(item);
    }
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog).toBeInTheDocument();
    expect(control).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("shows Find on page with a readonly empty input and passive keyboard without taking focus", () => {
    const control = focusWorkbenchControl();
    render(<SERPKeyScreen state="find" />);
    const task = screen.getByRole("region", { name: "Find on page" });
    const input = within(task).getByRole("searchbox", { name: "Find text on page" });
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("tabindex", "-1");
    expect(input).not.toHaveAttribute("autofocus");
    expect(control).toHaveFocus();
    for (const name of ["Previous match", "Next match", "Done"]) {
      const button = within(task).getByRole("button", { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    const keyboard = within(task).getByRole("group", { name: "iOS keyboard" });
    expect(within(keyboard).queryByRole("button")).not.toBeInTheDocument();
    expect(within(task).queryByRole("button", { name: "Back from search" })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(task).toBeInTheDocument();
    expect(within(task).getByRole("status")).toHaveTextContent("Find in this page");
    expect(control).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });
});
