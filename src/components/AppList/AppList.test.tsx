import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppList } from "./AppList";
import { AppListCard } from "./AppListCard";
import styles from "./AppList.module.css";

afterEach(cleanup);

describe("AppList", () => {
  it.each([
    ["yml", "Coolorado To offer In-person Voting..."],
    ["trending", "Sharks at Capitals"],
    ["as", "Weather today"],
    ["as-hub-page", "Weather today"],
    ["bing-search-history", "Medium"],
    ["copilot-history", "Create a research report on pop music"],
    ["section-header", "Open tabs"],
  ] as const)("renders the %s variant", (variant, title) => {
    const { container } = render(<AppList variant={variant} />);

    expect(container.firstElementChild).toHaveAttribute("data-variant", variant);
    expect(container.firstElementChild).toHaveTextContent(title);
  });

  it("renders both history lines and its built-in controls", () => {
    render(<AppList variant="bing-search-history" />);

    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("https://medium.com/")).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("honors the divider, logo, and right-control properties", () => {
    const { container } = render(
      <AppList
        variant="as"
        showDivider={false}
        showLogo={false}
        showRightControl={false}
      />,
    );

    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it("supports a custom source logo for AS controls", () => {
    render(
      <AppList
        variant="as"
        rightLogoSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
        rightLogoAlt="MSN"
      />,
    );

    expect(screen.getByRole("img", { name: "MSN" })).toHaveAttribute(
      "src",
      expect.stringContaining("data:image/svg+xml"),
    );
  });

  it("renders the AS autocomplete suffix with the Figma strong style", () => {
    const { container } = render(<AppList variant="as" />);

    expect(container.firstElementChild).toHaveTextContent("Weather today");
    expect(screen.getByText("today")).toHaveClass(styles.titleEmphasis);
    expect(container.querySelector('svg[viewBox="0 0 20 20"]')).toBeInTheDocument();
  });

  it("matches the AS Hub page emphasis and 24 px action container", () => {
    const { container } = render(<AppList variant="as-hub-page" />);

    expect(screen.getByText("today")).toHaveClass(styles.titleEmphasis);
    expect(container.querySelector(`.${styles.actionIcon}`)).toBeInTheDocument();
  });

  it("keeps the actual autocomplete match regular without inserting spaces into a word", () => {
    const { container, rerender } = render(<AppList variant="as" title="Weather forecast" autocompleteQuery="we" />);
    expect(container.querySelector(`.${styles.title}`)).toHaveTextContent(/^Weather forecast$/);
    expect(screen.getByText("We")).not.toHaveClass(styles.titleEmphasis);
    expect(screen.getByText("ather forecast")).toHaveClass(styles.titleEmphasis);
    rerender(<AppList variant="as" title="Weather forecast" autocompleteQuery="Weather fore" />);
    expect(screen.getByText("Weather fore")).not.toHaveClass(styles.titleEmphasis);
    expect(screen.getByText("cast")).toHaveClass(styles.titleEmphasis);
    rerender(<AppList variant="as" title="Weather forecast" autocompleteQuery="Weather forecast" />);
    expect(container.querySelector(`.${styles.titleEmphasis}`)).toBeNull();
  });

  it("matches query punctuation literally and supports matches inside a suggestion", () => {
    const { container } = render(<AppList variant="as" title="Learn C++ online" autocompleteQuery="C++" />);
    expect(container.querySelector(`.${styles.title}`)).toHaveTextContent(/^Learn C\+\+ online$/);
    expect(screen.getByText("C++")).not.toHaveClass(styles.titleEmphasis);
    expect(screen.getByText("Learn")).toHaveClass(styles.titleEmphasis);
    expect(screen.getByText("online")).toHaveClass(styles.titleEmphasis);
  });

  it("uses the supplied source icon and omits absent or failed suggestion logos", () => {
    const { container, rerender } = render(<AppList variant="as" title="Weather today" suggestionSource="history" />);
    expect(screen.getByRole("img", { name: "From search history" })).toBeInTheDocument();
    expect(container.querySelector(`.${styles.suggestionLogo}`)).toBeNull();
    rerender(<AppList variant="as" title="Weather today" suggestionSource="prediction" rightLogoSrc="/missing-logo.png" rightLogoAlt="Source logo" />);
    expect(screen.getByRole("img", { name: "Suggested query" })).toBeInTheDocument();
    fireEvent.error(screen.getByRole("img", { name: "Source logo" }));
    expect(container.querySelector(`.${styles.suggestionLogo}`)).toBeNull();
    expect(container.querySelector(`.${styles.actionIcon}`)).toBeInTheDocument();
    rerender(<AppList variant="as" title="Weather today" rightLogoSrc="/available-logo.png" rightLogoAlt="Source logo" />);
    expect(screen.getByRole("img", { name: "Source logo" })).toHaveAttribute("src", "/available-logo.png");
  });

  it("turns a row into an accessible action when requested", () => {
    const onClick = vi.fn();
    render(<AppList variant="copilot-history" onClick={onClick} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create a research report on pop music",
      }),
    );
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports Section header content and optional action", () => {
    const { rerender } = render(<AppList variant="section-header" />);
    expect(screen.getByText("View")).toBeInTheDocument();

    rerender(<AppList variant="section-header" showRightControl={false} />);
    expect(screen.queryByText("View")).not.toBeInTheDocument();
  });

  it("wraps one or multiple square List rows in an accessible card shell", () => {
    render(
      <AppListCard ariaLabel="History card">
        <AppList variant="bing-search-history" />
        <AppList variant="copilot-history" showDivider={false} />
      </AppListCard>,
    );

    const card = screen.getByRole("group", { name: "History card" });
    expect(card.children).toHaveLength(2);
    expect(card.children[0]).toHaveAttribute("data-variant", "bing-search-history");
    expect(card.children[1]).toHaveAttribute("data-variant", "copilot-history");
  });
});
