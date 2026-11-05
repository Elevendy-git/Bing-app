import { useLayoutEffect, useRef, type InputHTMLAttributes, type RefObject, type TouchEvent, type WheelEvent } from "react";
import { SEARCH_QUERY_MAX_LENGTH } from "../../services/searchSuggestions";
import { deleteBackward, limitTextLength } from "../../utils/textEditing";

/** Shared editing and drag-to-dismiss behavior; each screen owns keyboard presentation. */
export function useSearchInput({ value, onChange, inputRef, enabled, keyboardVisible, onKeyboardVisibleChange, onSubmit }: {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  enabled: boolean;
  keyboardVisible: boolean;
  onKeyboardVisibleChange: (visible: boolean) => void;
  onSubmit: (value: string) => void;
}) {
  const pendingSelection = useRef<number | null>(null);
  const scrollTouch = useRef<{ x: number; y: number }>();
  useLayoutEffect(() => {
    if (enabled && pendingSelection.current !== null) inputRef.current?.setSelectionRange(pendingSelection.current, pendingSelection.current);
    pendingSelection.current = null;
  }, [value, enabled, inputRef]);
  const change = (next: string) => {
    pendingSelection.current = null;
    onChange(limitTextLength(next, SEARCH_QUERY_MAX_LENGTH));
  };
  const dismissKeyboard = () => {
    inputRef.current?.blur();
    onKeyboardVisibleChange(false);
  };
  const edit = (letter?: string) => {
    if (!enabled || !keyboardVisible) return;
    const element = inputRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const inserted = letter ?? "";
    const next = letter === undefined ? deleteBackward(value, start, end)
      : { value: value.slice(0, start) + inserted + value.slice(end), caret: start + inserted.length };
    if (next.value.length > SEARCH_QUERY_MAX_LENGTH) return;
    change(next.value);
    if (next.value === value) element?.setSelectionRange(next.caret, next.caret);
    else pendingSelection.current = next.caret;
    element?.focus({ preventScroll: true });
  };
  const replaceQuery = (text: string) => {
    if (!enabled || !keyboardVisible) return;
    const next = limitTextLength(text, SEARCH_QUERY_MAX_LENGTH);
    change(next);
    if (next === value) inputRef.current?.setSelectionRange(next.length, next.length);
    else pendingSelection.current = next.length;
    inputRef.current?.focus({ preventScroll: true });
  };
  const dictate = (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    const start = inputRef.current?.selectionStart ?? value.length;
    const end = inputRef.current?.selectionEnd ?? start;
    const before = value.slice(0, start), after = value.slice(end);
    edit(`${before && !/\s$/.test(before) ? " " : ""}${text}${after && !/^[\s.,!?;:]/.test(after) ? " " : ""}`);
  };
  const inputProps: InputHTMLAttributes<HTMLInputElement> = {
    inputMode: "none", enterKeyHint: "search", autoComplete: "off", autoCorrect: "off", spellCheck: false,
    maxLength: SEARCH_QUERY_MAX_LENGTH,
    onFocus: () => { if (enabled) onKeyboardVisibleChange(true); },
    onBlur: () => { if (enabled) onKeyboardVisibleChange(false); },
    onChange: event => { if (enabled) change(event.target.value); },
    onKeyDown: event => {
      if (!enabled || event.nativeEvent.isComposing) return;
      if (event.key === "Enter") { event.preventDefault(); onSubmit(value); }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismissKeyboard(); }
    },
  };
  const scrollHandlers = {
    onWheel: enabled && keyboardVisible ? (event: WheelEvent) => {
      if (!event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) dismissKeyboard();
    } : undefined,
    onTouchStart: enabled ? (event: TouchEvent) => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      scrollTouch.current = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    } : undefined,
    onTouchMove: enabled && keyboardVisible ? (event: TouchEvent) => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined, start = scrollTouch.current;
      if (touch && start && Math.abs(touch.clientY - start.y) > Math.max(6, Math.abs(touch.clientX - start.x))) dismissKeyboard();
    } : undefined,
  };
  return { change, dismissKeyboard, type: (letter: string) => edit(letter), removeCharacter: () => edit(), replaceQuery, dictate, inputProps, scrollHandlers };
}
