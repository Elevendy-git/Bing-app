import type { FormEvent } from "react";
import { Camera24Regular, Search24Regular } from "@fluentui/react-icons";
import styles from "./BingSearchBox.module.css";

/** Figma 775:47824 uses the legacy 16 × 20 Fluent microphone geometry. */
function VoiceSearchIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <g transform="translate(4 2)">
        <path d="M15.25 9C15.6642 9 16 9.33579 16 9.75V12C16 16.4183 12.4183 20 8 20C3.58172 20 3.54341e-7 16.4183 0 12V9.75C0 9.33579 0.335786 9 0.75 9C1.16421 9 1.5 9.33579 1.5 9.75V12C1.5 15.5899 4.41015 18.5 8 18.5C11.5899 18.5 14.5 15.5899 14.5 12V9.75C14.5 9.33579 14.8358 9 15.25 9Z" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 0C10.7614 0 13 2.23858 13 5V12C13 14.7614 10.7614 17 8 17C5.23858 17 3 14.7614 3 12V5C3 2.23858 5.23858 0 8 0ZM8 1.5C6.067 1.5 4.5 3.067 4.5 5V12C4.5 13.933 6.067 15.5 8 15.5C9.933 15.5 11.5 13.933 11.5 12V5C11.5 3.067 9.933 1.5 8 1.5Z"
        />
      </g>
    </svg>
  );
}

export interface BingSearchBoxProps {
  /** Compact composer used once the Homepage search reaches the top. */
  compact?: boolean;
  /** Let a screen size the search box without changing the library example. */
  className?: string;
  /** Text displayed in the empty search field. */
  placeholder?: string;
  /** Accessible name announced for the search field. */
  ariaLabel?: string;
  /** Preserve the original text when rendering the inert navigation artwork. */
  defaultValue?: string;
  /** Homepage entry into the supplied Search flow. */
  onOpenSearch?: () => void;
}

/**
 * Bing App homepage search box, matched to the default/rest states in Figma
 * 775:47824 (Light) and 775:44984 (Dark).
 * The compact 56 px state comes from Homepage 6233:27222.
 */
export function BingSearchBox({
  placeholder = "Ask anything",
  ariaLabel = "Search Bing",
  className,
  compact = false,
  defaultValue,
  onOpenSearch,
}: BingSearchBoxProps) {
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <form className={[styles.root, compact && styles.compact, className].filter(Boolean).join(" ")} role="search" data-compact={compact} onSubmit={preventSubmit}>
      <div className={styles.inputRow}>
        <span className={styles.searchSlot} aria-hidden="true">
          <Search24Regular />
        </span>

        <span className={styles.textSlot}>
          <input
            className={styles.input}
            type="search"
            aria-label={ariaLabel}
            placeholder={placeholder}
            defaultValue={defaultValue}
            onFocus={onOpenSearch}
          />
        </span>

        <span className={styles.actions}>
          <button className={styles.action} type="button" aria-label="Start visual search">
            <Camera24Regular />
          </button>
          <button className={styles.action} type="button" aria-label="Start voice search">
            <VoiceSearchIcon />
          </button>
        </span>
      </div>
    </form>
  );
}
