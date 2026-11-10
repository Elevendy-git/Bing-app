import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewPrototypeNavigationProvider, PreviewPrototypeNavigationTarget, usePreviewPrototypeNavigation,
  usePublishPreviewPrototypeNavigation, type PreviewPrototypeCurrentPage } from "./PreviewPrototypeNavigation";

afterEach(cleanup);
function Consumer() {
  const { currentPage, available, requestNavigation } = usePreviewPrototypeNavigation();
  return <><output aria-label="Current page">{currentPage ?? "none"}</output>
    <output aria-label="Navigation available">{String(available)}</output>
    <button onClick={() => requestNavigation("recent")}>Navigate</button></>;
}
function Publisher({ page, navigate, enabled = true }: { page: PreviewPrototypeCurrentPage; navigate: () => void; enabled?: boolean }) {
  usePublishPreviewPrototypeNavigation(page, navigate, enabled);
  return null;
}

describe("Prototype navigation bridge", () => {
  it("publishes only the scoped live prototype, using the latest route callback", () => {
    const first = vi.fn(), latest = vi.fn(), gallery = vi.fn();
    const tree = (navigate: () => void) => <PreviewPrototypeNavigationProvider><Consumer />
      <PreviewPrototypeNavigationTarget><Publisher page="home" navigate={navigate} /></PreviewPrototypeNavigationTarget>
      <Publisher page="profile" navigate={gallery} />
    </PreviewPrototypeNavigationProvider>;
    const { rerender } = render(tree(first));
    expect(screen.getByLabelText("Current page")).toHaveTextContent("home");
    rerender(tree(latest));
    fireEvent.click(screen.getByText("Navigate"));
    expect(latest).toHaveBeenCalledWith("recent");
    expect(first).not.toHaveBeenCalled();
    expect(gallery).not.toHaveBeenCalled();
  });

  it("retains the page while inactive, blocks commands and unregisters a removed target", () => {
    const navigate = vi.fn();
    const tree = (enabled: boolean, mounted = true) => <PreviewPrototypeNavigationProvider><Consumer />
      {mounted && <PreviewPrototypeNavigationTarget><Publisher page="search" navigate={navigate} enabled={enabled} /></PreviewPrototypeNavigationTarget>}
    </PreviewPrototypeNavigationProvider>;
    const { rerender } = render(tree(true));
    rerender(tree(false));
    expect(screen.getByLabelText("Current page")).toHaveTextContent("search");
    expect(screen.getByLabelText("Navigation available")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("Navigate"));
    expect(navigate).not.toHaveBeenCalled();
    rerender(tree(true));
    fireEvent.click(screen.getByText("Navigate"));
    expect(navigate).toHaveBeenCalledOnce();
    rerender(tree(true, false));
    expect(screen.getByLabelText("Current page")).toHaveTextContent("none");
    expect(screen.getByLabelText("Navigation available")).toHaveTextContent("false");
  });

  it("is optional for standalone controls and publishers", () => {
    render(<><Consumer /><Publisher page="voice" navigate={vi.fn()} /></>);
    expect(screen.getByLabelText("Current page")).toHaveTextContent("none");
    fireEvent.click(screen.getByText("Navigate"));
  });
});
