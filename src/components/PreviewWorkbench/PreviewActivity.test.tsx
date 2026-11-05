import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewWorkbench } from "./PreviewWorkbench";
import { usePreviewActivity } from "./PreviewActivity";

function Probe() {
  const active = usePreviewActivity();
  const [count, setCount] = useState(0);
  return <div><output aria-label="Preview activity">{String(active)}</output>
    <button type="button" onClick={() => setCount(value => value + 1)}>Count {count}</button></div>;
}
afterEach(cleanup);

describe("Retained prototype activity", () => {
  it("leaves standalone screens active without a workbench provider", () => {
    render(<Probe />);
    expect(screen.getByLabelText("Preview activity")).toHaveTextContent("true");
  });

  it("pauses a hidden prototype without remounting or resetting its state", () => {
    render(<PreviewWorkbench title="Activity" screens={[]}><Probe /></PreviewWorkbench>);
    const indicator = screen.getByLabelText("Preview activity");
    fireEvent.click(screen.getByRole("button", { name: "Count 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "Key screens" }));
    expect(indicator).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "Prototype" }));
    expect(screen.getByLabelText("Preview activity")).toBe(indicator);
    expect(indicator).toHaveTextContent("true");
    expect(screen.getByRole("button", { name: "Count 1" })).toBeVisible();
  });
});
