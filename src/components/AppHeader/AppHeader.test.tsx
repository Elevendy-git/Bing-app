import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

afterEach(cleanup);

describe("AppHeader actions", () => {
  it("dispatches the correct callbacks, respects disabled actions, and never submits its host form", () => {
    const back = vi.fn();
    const share = vi.fn();
    const disabledAction = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <AppHeader
          leftAction={{ label: "Back", onClick: back }}
          rightActions={[
            { label: "Share", onClick: share },
            { label: "Delete", disabled: true, onClick: disabledAction },
          ]}
        />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(back).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    expect(disabledAction).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
