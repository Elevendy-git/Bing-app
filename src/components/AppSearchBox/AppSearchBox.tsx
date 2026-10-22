import { Camera24Regular, ChevronLeft24Regular, DismissCircle24Filled, SlideSearch24Regular } from "@fluentui/react-icons";
import type { InputHTMLAttributes, Ref } from "react";
import { SearchBoxProgress, type AppSearchBoxLoadState } from "./SearchBoxProgress";
import styles from "./AppSearchBox.module.css";

export type AppSearchBoxVariant = "search" | "recent" | "serp";
export type AppSearchBoxState = "zero-input" | "focus" | "input";

export interface AppSearchBoxProps {
  variant?: AppSearchBoxVariant;
  /** Visual state supplied by the parent, never changed by clicking the artwork. */
  state?: AppSearchBoxState;
  value?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  /** Opt-in input for a supplied screen flow. Library artwork remains passive. */
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "className" | "placeholder">;
  inputRef?: Ref<HTMLInputElement>;
  onBack?: () => void;
  onClear?: () => void;
  /** IAB navigation loading feedback; omitted when idle or failed. */
  loadState?: AppSearchBoxLoadState;
  /** A new request/retry starts a fresh loading bar. */
  loadKey?: string | number;
  /** Prototype opts in; Library loading specimens remain static. */
  animateLoading?: boolean;
}

/** C2 402:18101 and 1117:73172. Interaction specifications are supplied separately. */
export function AppSearchBox({
  variant = "search",
  state = "zero-input",
  value = "",
  placeholder = variant === "recent" ? "Search tabs, recents and bookmarks" : "Ask anything",
  className,
  ariaLabel = variant === "serp" ? "Search results search box" : variant === "recent" ? "Recent search box" : "Search page search box",
  inputProps,
  inputRef,
  onBack,
  onClear,
  loadState,
  loadKey,
  animateLoading,
}: AppSearchBoxProps) {
  const hasInput = state === "input";
  return (
    <div className={[styles.root, variant === "recent" && styles.recent, variant === "serp" && styles.serp, className].filter(Boolean).join(" ")}
      role="group" aria-label={ariaLabel} data-variant={variant} data-state={state}>
      {variant === "serp" ? <span className={styles.bingSlot} aria-hidden="true"><img src={new URL("./assets/bing.svg", import.meta.url).href} alt="" /></span>
      : onBack && variant === "search" ? <button type="button" className={styles.iconSlot} aria-label="Back from search"
        // Keep focus until click starts navigation, including a held mouse/touch press.
        onPointerDown={(event) => event.preventDefault()} onMouseDown={(event) => event.preventDefault()} onClick={onBack}>
        <ChevronLeft24Regular />
      </button> : <span className={styles.iconSlot} aria-hidden="true">
        {variant === "recent" ? <SlideSearch24Regular /> : <ChevronLeft24Regular />}
      </span>}
      <span className={styles.textSlot}>
        {inputProps ? <input {...inputProps} ref={inputRef} className={styles.input} type="search" value={value} placeholder={placeholder} /> : <>
        {state === "focus" && variant !== "serp" && <span className={styles.caret} aria-hidden="true" />}
        <span className={hasInput ? styles.value : styles.placeholder}>{hasInput ? value : placeholder}</span>
        {hasInput && variant !== "serp" && <span className={styles.caret} aria-hidden="true" />}
        </>}
      </span>
      {variant === "serp" ? <span className={styles.actionSlot} aria-hidden="true"><span className={styles.microphone} /></span> : hasInput ? (
        onClear ? <button type="button" className={`${styles.iconSlot} ${styles.dismiss}`} aria-label="Clear search query"
          onMouseDown={(event) => event.preventDefault()} onClick={onClear}><DismissCircle24Filled /></button> :
        <span className={`${styles.iconSlot} ${styles.dismiss}`} aria-hidden="true"><DismissCircle24Filled /></span>
      ) : variant === "search" ? (
        <span className={styles.actions} aria-hidden="true">
          <span className={styles.actionSlot}><Camera24Regular /></span>
          <span className={styles.actionSlot}><span className={styles.microphone} /></span>
        </span>
      ) : null}
      {variant === "serp" && loadState && <SearchBoxProgress key={loadKey} state={loadState} animate={animateLoading} />}
    </div>
  );
}
