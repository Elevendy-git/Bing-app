import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceLanguageSheet } from "./VoiceLanguageSheet";

const recognition = vi.fn();
beforeEach(() => {
  recognition.mockReset();
  vi.stubGlobal("SpeechRecognition", recognition);
  vi.stubGlobal("webkitSpeechRecognition", recognition);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const headerDone = () => within(screen.getByRole("heading", { name: "Speech language" }).parentElement!)
  .getByRole("button", { name: "Done" });

describe("Voice Search language sheet", () => {
  it("keeps passive specimens unfocused, read-only, and unable to complete or capture speech", () => {
    const onDone = vi.fn();
    render(<VoiceLanguageSheet language="it-IT" onDone={onDone} />);
    const dialog = screen.getByRole("dialog", { name: "Speech language" });
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    expect(dialog).not.toHaveFocus();
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(search).toHaveAttribute("readonly");
    expect(search).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Italiano" })).toBeChecked();
    const other = screen.getByRole("radio", { name: "Deutsch" });
    expect(other).toBeDisabled();
    expect(headerDone()).toBeDisabled();
    fireEvent.click(other);
    fireEvent.click(headerDone());
    fireEvent.change(search, { target: { value: "Deutsch" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Italiano" })).toBeChecked();
    expect(onDone).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("filters by language or locale without changing the selection until the user picks a row and presses Done", () => {
    const onDone = vi.fn();
    render(<VoiceLanguageSheet interactive onDone={onDone} />);
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    const initial = screen.getByRole("radio", { name: "English (default)" });
    expect(initial).toBeChecked();
    fireEvent.change(search, { target: { value: "DE-de" } });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    const german = screen.getByRole("radio", { name: "Deutsch" });
    expect(german).not.toBeChecked();
    fireEvent.click(german);
    expect(german).toBeChecked();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear language search" }));
    const italian = screen.getByRole("radio", { name: "Italiano" });
    fireEvent.click(italian);
    expect(italian).toBeChecked();
    expect(screen.getByRole("radio", { name: "Deutsch" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "English (default)" })).not.toBeChecked();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(headerDone());
    expect(onDone).toHaveBeenCalledExactlyOnceWith("it-IT");
    expect(recognition).not.toHaveBeenCalled();
  });

  it("uses the shared keyboard for editing and deletion, while keyboard Done only dismisses the keyboard", () => {
    const onDone = vi.fn();
    render(<VoiceLanguageSheet interactive onDone={onDone} />);
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    act(() => search.focus());
    const keyboard = within(screen.getByRole("group", { name: "iOS keyboard" }));
    fireEvent.click(keyboard.getByRole("button", { name: "D" }));
    fireEvent.click(keyboard.getByRole("button", { name: "e" }));
    expect(search).toHaveValue("De");
    expect(search).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Italiano" })).not.toBeInTheDocument();
    fireEvent.click(keyboard.getByRole("button", { name: "Delete character" }));
    expect(search).toHaveValue("D");
    expect(screen.getByRole("radio", { name: "Dansk" })).toBeInTheDocument();
    fireEvent.click(keyboard.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(recognition).not.toHaveBeenCalled();
  });

  it("shows no matches without losing the selected language and restores results through Clear", () => {
    const onDone = vi.fn();
    render(<VoiceLanguageSheet language="pl-PL" interactive onDone={onDone} />);
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    fireEvent.change(search, { target: { value: "zzzz-no-language" } });
    expect(screen.getByRole("status")).toHaveTextContent("No languages found");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear language search" }));
    expect(search).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Polski" })).toBeChecked();
    fireEvent.click(headerDone());
    expect(onDone).toHaveBeenCalledExactlyOnceWith("pl-PL");
  });

  it("dismisses the keyboard on the first Escape, then completes on the next Escape from the restored focus", () => {
    const onDone = vi.fn(), outerKeyDown = vi.fn();
    render(<div onKeyDown={outerKeyDown}><VoiceLanguageSheet interactive onDone={onDone} /></div>);
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    act(() => search.focus());
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Speech language" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onDone).toHaveBeenCalledExactlyOnceWith("en-US");
    expect(outerKeyDown).not.toHaveBeenCalled();
  });

  it("cycles Tab within visible controls and leaves the hidden keyboard out of the focus order", () => {
    render(<VoiceLanguageSheet interactive />);
    const dialog = screen.getByRole("dialog", { name: "Speech language" });
    const done = headerDone();
    const search = screen.getByRole("searchbox", { name: "Search speech languages" });
    const radios = screen.getAllByRole("radio");
    const last = radios[radios.length - 1];
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(done).toHaveFocus();
    act(() => last.focus());
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(done).toHaveFocus();
    fireEvent.keyDown(done, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    fireEvent.keyDown(done, { key: "Tab" });
    expect(search).toHaveFocus();
  });
});
