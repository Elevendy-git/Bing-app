import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceSearch, type VoiceSearchState } from "./VoiceSearch";

const recognition = vi.fn();
beforeEach(() => {
  recognition.mockReset();
  vi.stubGlobal("SpeechRecognition", recognition);
  vi.stubGlobal("webkitSpeechRecognition", recognition);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Voice Search screen", () => {
  it("keeps passive specimens unfocused and their controls inert without requesting speech capture", () => {
    const onDismiss = vi.fn(), onLanguage = vi.fn(), onRetry = vi.fn();
    render(<VoiceSearch state="offline" onDismiss={onDismiss} onLanguage={onLanguage} onRetry={onRetry} />);
    const specimen = screen.getByRole("main", { name: "Voice search" });
    expect(specimen).not.toHaveFocus();
    expect(specimen).not.toHaveAttribute("aria-modal");
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    fireEvent.keyDown(specimen, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(onLanguage).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("shows listening prompts, while requesting announces connection rather than recording", () => {
    const { rerender } = render(<VoiceSearch />);
    expect(screen.getByRole("status")).toHaveTextContent("I'm listening");
    expect(screen.getByText("Try saying")).toBeInTheDocument();
    expect(screen.getByText("Best restaurants near me")).toBeInTheDocument();
    expect(screen.getByText("Latest news in AI")).toBeInTheDocument();
    rerender(<VoiceSearch state="requesting" />);
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
    expect(screen.queryByText("I'm listening")).not.toBeInTheDocument();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("announces the supplied live transcript and replaces prompts as recognition progresses", () => {
    const { rerender } = render(<VoiceSearch state="input" transcript="Weather" />);
    expect(screen.getByRole("status")).toHaveTextContent("Weather");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByText("Try saying")).not.toBeInTheDocument();
    rerender(<VoiceSearch state="input" transcript="Weather tomorrow in Seattle" />);
    expect(screen.getByRole("status")).toHaveTextContent("Weather tomorrow in Seattle");
    expect(recognition).not.toHaveBeenCalled();
  });

  it.each<[VoiceSearchState, string]>([
    ["unrecognized", "Sorry, couldn’t quite catch that. Please tap to try again"],
    ["permission", "Microphone access was denied. Allow access in your browser settings, then tap to try again."],
    ["unsupported", "Voice search isn’t supported in this browser."],
    ["microphone", "No microphone is available. Connect a microphone, then tap to try again."],
    ["connection", "Voice search couldn’t connect. Please tap to try again."],
    ["paused", "Voice search is paused. Tap to start listening again."],
  ])("describes %s without claiming to listen or inventing a transcript", (state, copy) => {
    render(<VoiceSearch state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent(copy);
    expect(screen.queryByText("I'm listening")).not.toBeInTheDocument();
    expect(screen.queryByText("Best laptops")).not.toBeInTheDocument();
    expect(screen.queryByText("Try saying")).not.toBeInTheDocument();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("shows the offline recovery guidance and a passive Retry control", () => {
    render(<VoiceSearch state="offline" />);
    expect(screen.getByRole("heading", { name: "You appear offline" })).toBeInTheDocument();
    expect(screen.getByText("Please find a stronger network signal, join Wi-Fi, or check your mobile data settings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    expect(screen.queryByText("I'm listening")).not.toBeInTheDocument();
  });

  it("focuses the interactive dialog and dismisses through Close or Escape without leaking Escape", () => {
    const onDismiss = vi.fn(), outerKeyDown = vi.fn();
    render(<div onKeyDown={outerKeyDown}><VoiceSearch interactive onDismiss={onDismiss} /></div>);
    const dialog = screen.getByRole("dialog", { name: "Voice search" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close voice search" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    const cancelled = !fireEvent.keyDown(screen.getByRole("button", { name: "Choose speech language" }), { key: "Escape" });
    expect(cancelled).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(outerKeyDown).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("traps Tab and Shift-Tab across the language, recovery, and Close controls", () => {
    render(<VoiceSearch state="offline" interactive />);
    const dialog = screen.getByRole("dialog", { name: "Voice search" });
    const language = screen.getByRole("button", { name: "Choose speech language" });
    const retry = screen.getByRole("button", { name: "Retry" });
    const close = screen.getByRole("button", { name: "Close voice search" });
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(language).toHaveFocus();
    fireEvent.keyDown(language, { key: "Tab" });
    expect(retry).toHaveFocus();
    fireEvent.keyDown(retry, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab" });
    expect(language).toHaveFocus();
    fireEvent.keyDown(language, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
    dialog.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
  });

  it.each<VoiceSearchState>(["unrecognized", "offline", "permission", "paused"])("delegates language and %s recovery actions to the host", state => {
    const onLanguage = vi.fn(), onRetry = vi.fn(), onDismiss = vi.fn();
    render(<VoiceSearch state={state} interactive onLanguage={onLanguage} onRetry={onRetry} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose speech language" }));
    expect(onLanguage).toHaveBeenCalledOnce();
    const retry = state === "offline" ? screen.getByRole("button", { name: "Retry" })
      : screen.getByRole("button", { name: /tap to (try again|start listening again)/i });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("keeps unsupported-browser guidance informational even in the interactive dialog", () => {
    const onRetry = vi.fn();
    render(<VoiceSearch state="unsupported" interactive onRetry={onRetry} />);
    const message = screen.getByRole("status");
    expect(message).toHaveTextContent("Voice search isn’t supported in this browser.");
    fireEvent.click(message);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(onRetry).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });
});
