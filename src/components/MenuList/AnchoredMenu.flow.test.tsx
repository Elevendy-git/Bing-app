import { useRef } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnchoredMenu, useAnchoredMenu } from "./AnchoredMenu";
import { MenuList } from "./MenuList";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
afterEach(cleanup);

function Example({ active = true }: { active?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const menu = useAnchoredMenu({ root, fallback: content, active });
  return <main ref={root} tabIndex={-1} aria-label="Menu example">
    <div ref={content} tabIndex={-1} {...(menu.presented ? { inert: "" } : {})}>
      <button onClick={event => menu.openPage(event.currentTarget)}>Open menu</button>
    </div>
    <AnchoredMenu menu={menu} interactive>
      <MenuList autoFocus onDismiss={() => menu.close()} items={[{ id: "close", label: "Close", onSelect: () => menu.close() }]} />
    </AnchoredMenu>
  </main>;
}

describe("Shared menu focus ownership", () => {
  it("restores focus after outside pointer defaults, even with reduced motion", async () => {
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(opener);
    const menu = screen.getByRole("menu");
    expect(screen.getByRole("menuitem", { name: "Close" })).toHaveFocus();
    fireEvent.pointerDown(menu.parentElement!.previousElementSibling!);
    // Model the browser's default focus change after the pointerdown handler.
    act(() => screen.getByRole("main").focus());
    await waitFor(() => expect(opener).toHaveFocus());
    expect(opener.parentElement).not.toHaveAttribute("inert");
  });

  it("closes on leaving a screen without restoring focus into it", async () => {
    const { rerender } = render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    rerender(<Example active={false} />);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    act(() => screen.getByRole("main").focus());
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
    expect(screen.getByRole("button", { name: "Open menu" })).not.toHaveFocus();
  });
});
