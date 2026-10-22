import { afterEach, describe, expect, it } from "vitest";
import { measureSearchOrigin } from "./searchTransition";

afterEach(() => { document.body.innerHTML = ""; });

describe("Search composer measurement", () => {
  it.each([0.65, 1, 1.5])("keeps the same device-local endpoints at workbench scale %s", scale => {
    const screen = document.createElement("div");
    screen.style.setProperty("--gnrc-layout-search-inset", "16px");
    screen.innerHTML = '<div data-variant="serp"><input value="Weather" /></div>';
    document.body.append(screen);
    Object.defineProperty(screen, "offsetWidth", { value: 402 });
    screen.getBoundingClientRect = () => ({ left: 140, top: 90, width: 402 * scale, height: 874 * scale }) as DOMRect;
    const composer = screen.firstElementChild as HTMLElement;
    composer.getBoundingClientRect = () => ({ left: 140 + 16 * scale, top: 90 + 62 * scale, width: 332 * scale, height: 48 * scale }) as DOMRect;
    expect(measureSearchOrigin(screen, "serp")).toMatchObject({ offsetY: 0, height: 48, insetEnd: 38, value: "Weather" });
    composer.setAttribute("role", "search");
    composer.getBoundingClientRect = () => ({ left: 140 + 16 * scale, top: 90 + 192 * scale, width: 370 * scale, height: 60 * scale }) as DOMRect;
    expect(measureSearchOrigin(screen, "home")).toMatchObject({ offsetY: 130, height: 60, insetEnd: 0 });
  });
});
