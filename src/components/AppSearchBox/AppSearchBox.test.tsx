import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSearchBox } from "./AppSearchBox";

afterEach(cleanup);

describe("App search-box voice entry", () => {
  it.each(["search", "serp"] as const)("keeps %s artwork passive without a voice callback", variant => {
    render(<AppSearchBox variant={variant} />);
    expect(screen.queryByRole("button", { name: "Start voice search" })).toBeNull();
  });

  it.each(["search", "serp"] as const)("opens %s voice without stealing input focus or triggering a parent edit", variant => {
    const voice = vi.fn(), edit = vi.fn();
    render(<div onClick={edit}><AppSearchBox variant={variant} onVoiceSearch={voice}
      inputProps={{ "aria-label": "Query", readOnly: true, onClick: edit }} /></div>);
    const input = screen.getByRole("searchbox", { name: "Query" });
    input.focus();
    const microphone = screen.getByRole("button", { name: "Start voice search" });
    expect(fireEvent.pointerDown(microphone)).toBe(false);
    expect(fireEvent.mouseDown(microphone)).toBe(false);
    fireEvent.click(microphone);
    expect(input).toHaveFocus();
    expect(voice).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
  });

  it("preserves Search's existing Clear action while text is present", () => {
    const voice = vi.fn(), clear = vi.fn();
    render(<AppSearchBox variant="search" state="input" value="Weather" onVoiceSearch={voice} onClear={clear} />);
    expect(screen.queryByRole("button", { name: "Start voice search" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(clear).toHaveBeenCalledOnce();
    expect(voice).not.toHaveBeenCalled();
  });
});
