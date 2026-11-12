import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PreviewWorkbench } from "./PreviewWorkbench";
import { usePublishPreviewPrototypeNavigation, type PreviewPrototypePage } from "./PreviewPrototypeNavigation";
import { previewComponentGroups } from "../../previewCatalog";

// JSDOM does not implement native dialogs. Browser QA covers modal focus containment.
const dialogMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype);
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
  });
});
afterAll(() => {
  for (const name of ["showModal", "close"]) {
    if (dialogMethods[name]) Object.defineProperty(HTMLDialogElement.prototype, name, dialogMethods[name]);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderWorkbench() {
  return render(
    <PreviewWorkbench title="Search box" componentGroups={previewComponentGroups}>
      <input aria-label="Prototype draft" />
    </PreviewWorkbench>,
  );
}

function mockWorkbenchMedia(compact = false) {
  const compactMedia = Object.assign(new EventTarget(), { matches: compact });
  const darkMedia = Object.assign(new EventTarget(), { matches: false });
  const otherMedia = Object.assign(new EventTarget(), {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });
  vi.stubGlobal("matchMedia", vi.fn((query: string) => query === "(max-width: 1024px)" ? compactMedia
    : query === "(prefers-color-scheme: dark)" ? darkMedia : otherMedia));
  const update = (media: typeof compactMedia, matches: boolean) => act(() => {
    media.matches = matches;
    media.dispatchEvent(new Event("change"));
  });
  return {
    darkMedia,
    setCompact: (matches: boolean) => update(compactMedia, matches),
    setSystemDark: (matches: boolean) => update(darkMedia, matches),
  };
}

function NavigablePrototype({ onNavigate }: { onNavigate?: (page: PreviewPrototypePage) => void }) {
  const [page, setPage] = useState<PreviewPrototypePage>("home");
  usePublishPreviewPrototypeNavigation(page, page => { onNavigate?.(page); setPage(page); });
  return <>
    <output aria-label="Current prototype page">{page}</output>
    <input aria-label="Prototype draft" />
    {page === "search" && <input autoFocus aria-label="Destination search" />}
  </>;
}

function renderCompactWorkbench(onNavigate?: (page: PreviewPrototypePage) => void) {
  return render(<PreviewWorkbench title="Homepage" componentGroups={previewComponentGroups}>
    <NavigablePrototype onNavigate={onNavigate} />
  </PreviewWorkbench>);
}

function selectCompactView(name: "Prototype" | "Key screens" | "Library") {
  // JSDOM cannot evaluate viewport CSS. matchMedia drives the React branch;
  // labels let us exercise the compact toolbar's shared view switcher.
  fireEvent.click(within(screen.getByLabelText("Workbench controls")).getByLabelText(name));
}

function openNavigation() {
  const toggle = screen.getByLabelText("Open navigation");
  act(() => toggle.focus());
  fireEvent.click(toggle);
  return screen.getByRole("region", { name: "Workbench navigation" });
}

describe("PreviewWorkbench", () => {
  it("resets only Prototype content and keeps Reset out of Key screens and Library", () => {
    renderWorkbench();
    fireEvent.change(screen.getByLabelText("Prototype draft"), { target: { value: "unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset prototype" }));
    expect(screen.getByLabelText("Prototype draft")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Key screens" }));
    expect(screen.queryByRole("button", { name: "Reset prototype" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Key screens" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.queryByRole("button", { name: "Reset prototype" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Component library" })).toBeVisible();
  });

  it("opens a key screen in place and Escape returns focus without closing Settings", () => {
    render(
      <PreviewWorkbench title="Homepage" defaultView="keyscreens">
        <input aria-label="Homepage search" />
      </PreviewWorkbench>,
    );
    const gallery = screen.getByRole("region", { name: "Key screens" });
    expect(within(gallery).queryByRole("link")).not.toBeInTheDocument();
    const trigger = within(gallery).getByRole("button", { name: "Open enlarged preview of Homepage" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Homepage" });
    expect(within(dialog).getByRole("textbox", { name: "Homepage search" })).toBeVisible();
    // Some browser keyboard paths leave focus on the body; the modal still owns Escape.
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Settings" })).toBeVisible();
    expect(trigger).toHaveFocus();
  });

  it("also enlarges the screen thumbnail and closes back to the same gallery", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Key screens" }));
    const trigger = screen.getByRole("button", { name: "Enlarge Search box" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Search box" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close enlarged preview" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Key screens" })).toBeVisible();
    expect(trigger).toHaveFocus();
  });

  it("keeps prototype input when switching to key screens and back", () => {
    renderWorkbench();
    fireEvent.change(screen.getByLabelText("Prototype draft"), { target: { value: "weekend trip" } });
    fireEvent.click(screen.getByRole("button", { name: "Key screens" }));
    const keyScreens = screen.getByRole("region", { name: "Key screens" });
    expect(within(keyScreens).getByRole("region", { name: "Search box preview" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Bing app preview", hidden: true })).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Prototype" }));
    expect(screen.getByLabelText("Prototype draft")).toHaveValue("weekend trip");
    expect(screen.getByRole("region", { name: "Bing app preview" })).toBeVisible();
  });

  it("opens a component's variants and returns to the full library", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    expect(within(library).getAllByRole("article").length).toBeGreaterThan(0);
    fireEvent.click(within(library).getByRole("button", { name: /^Feed Card/ }));
    expect(within(library).getByRole("heading", { name: "Watch" })).toBeVisible();
    expect(within(library).queryByRole("heading", { name: "Bing Search Box" })).not.toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: "Single card" })).toBeVisible();
    fireEvent.click(within(library).getByRole("button", { name: /^All library items/ }));
    expect(within(library).getByRole("heading", { name: "Bing Search Box" })).toBeVisible();
  });

  it("browses whole categories and individual items independently from collapsing navigation", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    const navigation = within(library).getByRole("navigation", { name: "Component categories" });
    fireEvent.click(within(navigation).getByRole("button", { name: /^Navigation/ }));
    expect(within(library).getByRole("heading", { name: "Navigation", level: 1 })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "Header" })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "App Footer" })).toBeVisible();
    fireEvent.click(within(navigation).getByRole("button", { name: "Collapse Navigation" }));
    expect(within(navigation).queryByRole("button", { name: /^Footer/ })).not.toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: "App Footer" })).toBeVisible();
    fireEvent.click(within(navigation).getByRole("button", { name: "Expand Navigation" }));
    fireEvent.click(within(navigation).getByRole("button", { name: /^Footer/ }));
    expect(within(library).getByRole("heading", { name: "Footer", level: 1 })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "App Footer" })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "IAB Footer" })).toBeVisible();
    expect(within(library).queryByRole("heading", { name: "Feed Card" })).not.toBeInTheDocument();
  });

  it("uses purpose-based categories and opens component previews in the selected appearance", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    for (const category of ["Basics", "Styles", "Sheet", "Page"]) {
      expect(within(library).queryByRole("button", { name: new RegExp(`^${category}`) })).not.toBeInTheDocument();
      expect(within(library).queryByRole("option", { name: new RegExp(`^${category}`) })).not.toBeInTheDocument();
    }

    expect(within(library).getByRole("button", { name: /^Overlays/ })).toBeVisible();
    fireEvent.click(within(library).getByRole("button", { name: /^Bing Search Box/ }));
    expect(within(library).getByRole("heading", { name: "Bing Search Box", level: 1 })).toBeVisible();
    const searchPreview = within(library).getByRole("searchbox", { name: "Search Bing" });
    expect(searchPreview).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(searchPreview.closest("[data-theme]")).toHaveAttribute("data-theme", "dark");
  });

  it("retains the original library tree, search and disclosure state across navigation visits", () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    selectCompactView("Library");
    const library = screen.getByRole("region", { name: "Component library" });
    const panel = openNavigation();
    const navigation = within(panel).getByRole("navigation", { name: "Component categories" });
    fireEvent.click(within(navigation).getByRole("button", { name: "Collapse Content" }));
    expect(panel).toBeVisible();
    expect(within(navigation).getByRole("button", { name: "Expand Content" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(panel).not.toBeVisible();

    openNavigation();
    expect(within(navigation).getByRole("button", { name: "Expand Content" })).toBeVisible();
    const search = within(navigation).getByRole("searchbox", { name: "Search library" });
    fireEvent.change(search, { target: { value: "avatar private" } });
    expect(panel).toBeVisible();
    fireEvent.click(within(navigation).getByRole("button", { name: "Avatar" }));
    expect(panel).not.toBeVisible();
    expect(within(library).getByRole("heading", { name: "Avatar", level: 1 })).toBeVisible();

    openNavigation();
    expect(within(navigation).getByRole("searchbox", { name: "Search library" })).toBe(search);
    expect(search).toHaveValue("avatar private");
    expect(within(navigation).getByRole("button", { name: "Avatar" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(within(navigation).getByRole("button", { name: "Clear library search" }));
    expect(panel).toBeVisible();
    expect(search).toHaveValue("");
  });

  it("searches the whole library from a selected component and narrows previews using multiple words", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    fireEvent.click(within(library).getByRole("button", { name: /^Footer/ }));
    const search = within(library).getByRole("searchbox", { name: "Search library" });
    fireEvent.change(search, { target: { value: "  SpOrTs   GLANCE  " } });
    expect(within(library).getByRole("heading", { name: "Search results", level: 1 })).toBeVisible();
    expect(within(library).getByRole("status")).toHaveTextContent("1 component · 1 preview");
    expect(within(library).getByRole("heading", { name: "Sports" })).toBeVisible();
    expect(within(library).queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
    expect(within(library).queryByRole("heading", { name: "Money" })).not.toBeInTheDocument();
    expect(within(library).queryByRole("button", { name: /^Footer/ })).not.toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /^All results/ })).toHaveAttribute("aria-current", "page");
  });

  it("finds states inside combined previews, expands their category, and clears back to all items", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    const navigation = within(library).getByRole("navigation", { name: "Component categories" });
    fireEvent.click(within(navigation).getByRole("button", { name: "Collapse Content" }));
    fireEvent.change(within(library).getByRole("searchbox", { name: "Search library" }), { target: { value: "final" } });
    expect(within(navigation).getByRole("button", { name: /^Glance Card/ })).toBeVisible();
    expect(within(library).getByRole("status")).toHaveTextContent("1 component · 1 preview");
    fireEvent.click(within(navigation).getByRole("button", { name: "Glance Card" }));
    expect(within(library).getByRole("heading", { name: "Glance Card", level: 1 })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "Sports" })).toBeVisible();
    fireEvent.click(within(library).getByRole("button", { name: "Clear library search" }));
    expect(within(library).getByRole("heading", { name: "Library", level: 1 })).toBeVisible();
    expect(within(library).getByRole("heading", { name: "Avatar" })).toBeVisible();
    const glanceGroup = within(library).getByRole("region", { name: "Glance Card" });
    expect(within(glanceGroup).getByRole("heading", { name: "Overview" })).toBeVisible();
    expect(within(library).getByRole("searchbox", { name: "Search library" })).toHaveFocus();
  });

  it("recovers from no results and consumes Escape without closing Settings", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    const search = within(library).getByRole("searchbox", { name: "Search library" });
    fireEvent.change(search, { target: { value: "missing-component" } });
    expect(within(library).getByText("No results for “missing-component”.")).toBeVisible();
    expect(within(library).queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(within(library).getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: "avatar private" } });
    expect(within(library).getByRole("heading", { name: "Default · 40 px" })).toBeVisible();
    expect(within(library).queryByRole("heading", { name: "Large · 64 px" })).not.toBeInTheDocument();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(screen.getByRole("complementary", { name: "Settings" })).toBeVisible();
  });

  it("places the interactive List Card overview above the seven row variants", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    fireEvent.click(within(within(library).getByRole("navigation", { name: "Component categories" }))
      .getByRole("button", { name: "List" }));
    const list = within(library).getByRole("region", { name: "List" });
    const previews = within(list).getAllByRole("article");
    expect(previews).toHaveLength(8);
    expect(previews[0]).toHaveAccessibleName("List Card");
    expect(within(previews[0]).getByRole("heading", { name: "Overview" })).toBeVisible();
    const variantTitles = [
      "YML", "Trending", "AS", "AS Hub page", "Bing search history", "Copilot history", "Section header",
    ];
    variantTitles.forEach((title, index) => {
      expect(within(previews[index + 1]).getByRole("heading", { name: title })).toBeVisible();
    });
    fireEvent.change(within(previews[0]).getByRole("combobox", { name: "List type" }), { target: { value: "trending" } });
    fireEvent.click(within(previews[0]).getByRole("button", { name: "Multi list" }));
    expect(within(previews[0]).getByRole("group", { name: "Trending multi-list card" }).children).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(within(previews[0]).getByRole("group", { name: "Trending multi-list card" }).closest("[data-theme]")).toHaveAttribute("data-theme", "dark");
  });

  it("finds the List Card overview by its card and layout names", () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const library = screen.getByRole("region", { name: "Component library" });
    const search = within(library).getByRole("searchbox", { name: "Search library" });
    for (const query of ["list card", "single list", "multi list"]) {
      fireEvent.change(search, { target: { value: query } });
      expect(within(library).getByRole("status")).toHaveTextContent("1 component · 1 preview");
      expect(within(library).getByRole("article", { name: "List Card" })).toBeVisible();
    }
  });

  it("follows system changes while keeping an explicit theme override until System is restored", () => {
    const { darkMedia, setSystemDark } = mockWorkbenchMedia();
    const { unmount } = renderWorkbench();
    const preview = screen.getByRole("region", { name: "Bing app preview" });
    expect(preview).toHaveAttribute("data-theme", "light");
    setSystemDark(true);
    expect(preview).toHaveAttribute("data-theme", "dark");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    setSystemDark(false);
    setSystemDark(true);
    expect(preview).toHaveAttribute("data-theme", "light");
    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(preview).toHaveAttribute("data-theme", "dark");
    const removeListener = vi.spyOn(darkMedia, "removeEventListener");
    unmount();
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("closes settings with Escape and restores keyboard focus when reopened", () => {
    renderWorkbench();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(screen.getByRole("button", { name: "Close settings" })).toHaveFocus();
  });

  it("keeps the web workbench view switcher and original navigation tree without losing the live draft", () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    expect(screen.queryByRole("complementary", { name: "Prototype navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open inspector")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Open navigation")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("combobox", { name: "Prototype page" })).not.toBeInTheDocument();
    const draft = screen.getByRole("textbox", { name: "Prototype draft" });
    fireEvent.change(draft, { target: { value: "weekend trip" } });
    const navigation = openNavigation();
    expect(navigation).toBeVisible();
    fireEvent.click(within(navigation).getByRole("button", { name: "Open Recent page" }));
    expect(screen.getByLabelText("Open navigation")).toHaveAttribute("aria-expanded", "false");
    expect(navigation).not.toBeVisible();
    expect(screen.getByLabelText("Current prototype page")).toHaveTextContent("recent");

    openNavigation();
    selectCompactView("Key screens");
    expect(screen.queryByRole("region", { name: "Workbench navigation" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open navigation")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("region", { name: "Key screens" })).toBeVisible();
    const groups = openNavigation();
    expect(within(groups).getByRole("navigation", { name: "Key screen groups" })).toBeVisible();
    fireEvent.click(within(groups).getByRole("button", { name: "Show Key screens group" }));
    expect(groups).not.toBeVisible();
    selectCompactView("Library");
    expect(screen.getByRole("region", { name: "Component library" })).toBeVisible();
    selectCompactView("Prototype");
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toBe(draft);
    expect(draft).toHaveValue("weekend trip");
    expect(screen.getByLabelText("Current prototype page")).toHaveTextContent("recent");
    const reopened = openNavigation();
    expect(within(reopened).getByRole("button", { name: "Open Recent page" })).toHaveAttribute("aria-current", "page");
  });

  it("shares appearance and reset through the mobile Inspector", async () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    fireEvent.change(screen.getByRole("textbox", { name: "Prototype draft" }), { target: { value: "clear me" } });
    fireEvent.click(screen.getByLabelText("Open inspector"));
    const inspector = screen.getByRole("dialog", { name: "Inspector" });
    expect(inspector).not.toHaveAttribute("data-side");
    expect(within(inspector).getByText("iPhone 18 Pro")).toBeVisible();
    expect(within(inspector).getByText("402 × 874 px")).toBeVisible();
    expect(within(inspector).queryByText("This device")).not.toBeInTheDocument();
    expect(within(inspector).queryByRole("group", { name: "Preview view" })).not.toBeInTheDocument();
    fireEvent.click(within(inspector).getByRole("button", { name: "Dark" }));
    expect(screen.getByRole("region", { name: "Bing app preview" })).toHaveAttribute("data-theme", "dark");
    fireEvent.click(within(inspector).getByRole("button", { name: "Reset prototype" }));
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toHaveValue("");
    expect(screen.getByLabelText("Open inspector")).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument());
  });

  it("expands navigation inline without a modal or background inertness and allows the same toggle to close it", () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    const toggle = screen.getByLabelText("Open navigation");
    expect(toggle).not.toHaveAttribute("aria-haspopup");
    const navigation = openNavigation();
    expect(toggle).toHaveAccessibleName("Close navigation");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", navigation.id);
    expect(toggle).toHaveFocus();
    expect(navigation.closest("dialog")).toBeNull();
    expect(document.querySelector("dialog[open]")).toBeNull();
    expect(document.querySelector("[inert]")).toBeNull();
    const draft = screen.getByRole("textbox", { name: "Prototype draft" });
    act(() => draft.focus());
    expect(draft).toHaveFocus();
    act(() => toggle.focus());
    fireEvent.click(toggle);
    expect(navigation).toHaveAttribute("hidden");
    expect(toggle).toHaveAccessibleName("Open navigation");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();

    selectCompactView("Library");
    const libraryNavigation = openNavigation();
    const search = within(libraryNavigation).getByRole("searchbox", { name: "Search library" });
    act(() => search.focus());
    // Safari can dispatch a button tap without moving focus out of the input.
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(libraryNavigation).not.toBeVisible();
    expect(screen.getByLabelText("Open navigation")).toHaveFocus();
  });

  it("clears a library query on the first Escape and closes inline navigation on the second", () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    selectCompactView("Library");
    const navigation = openNavigation();
    const search = within(navigation).getByRole("searchbox", { name: "Search library" });
    act(() => search.focus());
    fireEvent.change(search, { target: { value: "avatar private" } });
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(navigation).toBeVisible();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(navigation).not.toBeVisible();
    expect(screen.getByLabelText("Open navigation")).toHaveFocus();
  });

  it("immediately opens Search without taking focus away from its input or replacing the live draft", () => {
    mockWorkbenchMedia(true);
    const onNavigate = vi.fn(() => expect(document.querySelector("dialog[open]")).toBeNull());
    renderCompactWorkbench(onNavigate);
    const draft = screen.getByRole("textbox", { name: "Prototype draft" });
    fireEvent.change(draft, { target: { value: "retained search draft" } });
    const navigation = openNavigation();
    const pageButton = within(navigation).getByRole("button", { name: "Open Search page" });
    act(() => pageButton.focus());
    fireEvent.click(pageButton);
    expect(navigation).not.toBeVisible();
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("search");
    expect(screen.getByLabelText("Current prototype page")).toHaveTextContent("search");
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toBe(draft);
    expect(draft).toHaveValue("retained search draft");
    expect(screen.getByRole("textbox", { name: "Destination search" })).toHaveFocus();
  });

  it("closes inline navigation before opening the Inspector", () => {
    mockWorkbenchMedia(true);
    renderCompactWorkbench();
    const navigation = openNavigation();
    fireEvent.click(screen.getByLabelText("Open inspector"));
    expect(navigation).not.toBeVisible();
    expect(screen.getByRole("dialog", { name: "Inspector" })).toBeVisible();
  });

  it("dismisses compact panels on desktop resize while retaining the same live app and route", () => {
    const { setCompact } = mockWorkbenchMedia(true);
    renderCompactWorkbench();
    const draft = screen.getByRole("textbox", { name: "Prototype draft" });
    fireEvent.change(draft, { target: { value: "keep across resize" } });
    const navigation = openNavigation();
    fireEvent.click(within(navigation).getByRole("button", { name: "Open History page" }));
    expect(navigation).not.toBeVisible();
    fireEvent.click(screen.getByLabelText("Open inspector"));
    expect(screen.getByRole("dialog", { name: "Inspector" })).toBeVisible();
    setCompact(false);
    expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Settings" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open History page" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toBe(draft);
    expect(draft).toHaveValue("keep across resize");
    setCompact(true);
    expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open inspector")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Current prototype page")).toHaveTextContent("history");
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toBe(draft);
    openNavigation();
    setCompact(false);
    setCompact(true);
    expect(screen.queryByRole("region", { name: "Workbench navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Prototype draft" })).toBe(draft);
    expect(draft).toHaveValue("keep across resize");
  });
});
