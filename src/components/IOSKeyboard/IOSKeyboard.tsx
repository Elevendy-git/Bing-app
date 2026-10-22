import type { CSSProperties, ReactNode } from "react";
import { IOSHomeIndicator } from "../IOSHomeIndicator";
import { getIOSKeyboardHeight, type IOSAppearance } from "../IOSNative/iosMetrics";
import styles from "./IOSKeyboard.module.css";

const assets = {
  shift: new URL("./assets/ios27-shift-on.svg", import.meta.url).href,
  shiftDark: new URL("./assets/ios27-shift-on-dark.svg", import.meta.url).href,
  shiftOff: new URL("./assets/ios27-shift-off.svg", import.meta.url).href,
  delete: new URL("./assets/ios27-delete.svg", import.meta.url).href,
  deleteDark: new URL("./assets/ios27-delete-dark.svg", import.meta.url).href,
  return: new URL("./assets/ios27-return.svg", import.meta.url).href,
  returnDark: new URL("./assets/ios27-return-dark.svg", import.meta.url).href,
  emoji: new URL("./assets/ios27-emoji.svg", import.meta.url).href,
  emojiDark: new URL("./assets/ios27-emoji-dark.svg", import.meta.url).href,
  dictation: new URL("./assets/ios27-dictation.svg", import.meta.url).href,
  dictationDark: new URL("./assets/ios27-dictation-dark.svg", import.meta.url).href,
};

export type IOSKeyboardLayout = "uppercase" | "lowercase" | "numeric";
export type IOSKeyboardReturnKey = "return" | "search" | "done";
export interface IOSKeyboardProps {
  appearance?: IOSAppearance;
  layout?: IOSKeyboardLayout;
  returnKey?: IOSKeyboardReturnKey;
  showSuggestions?: boolean;
  suggestions?: readonly [string, string, string];
  onType?: (letter: string) => void;
  onDelete?: () => void;
  onReturn?: () => void;
  /** Screens keep one stationary indicator above the sliding keyboard. */
  showHomeIndicator?: boolean;
}

function Artwork({ light, dark }: { light: string; dark: string }) {
  return <><img className={styles.lightArtwork} src={light} alt="" /><img className={styles.darkArtwork} src={dark} alt="" /></>;
}

/** Apple iOS 27 keyboard. State is controlled by the host, not by preview taps. */
export function IOSKeyboard({ appearance = "auto", layout = "uppercase", returnKey = "return", showSuggestions = true,
  suggestions = ["“Design”", "Designs", "Designed"], onType, onDelete, onReturn, showHomeIndicator = true }: IOSKeyboardProps) {
  const key = (label: string, content: ReactNode, className: string, action?: () => void) => action ? (
    <button key={label} type="button" className={className} aria-label={label} onClick={action}>{content}</button>
  ) : <span key={label} className={className} aria-hidden="true">{content}</span>;
  const letters = (row: string) => Array.from(row, (letter) => key(letter, <span className={styles.letter}>{letter}</span>, styles.key, onType ? () => onType(letter) : undefined));
  const numeric = layout === "numeric";
  const letterCase = (row: string) => layout === "lowercase" ? row.toLowerCase() : row;
  const shift = layout === "lowercase"
    ? <span className={styles.shiftOutline} style={{ "--gnrc-ios-shift-artwork": `url("${assets.shiftOff}")` } as CSSProperties} />
    : <Artwork light={assets.shift} dark={assets.shiftDark} />;
  return <div className={styles.root} role="group" aria-label="iOS keyboard" data-ios-keyboard="27" data-layout={layout}
    data-ios-appearance={appearance === "auto" ? undefined : appearance}
    style={{ "--gnrc-ios-keyboard-height": `${getIOSKeyboardHeight(showSuggestions)}px` } as CSSProperties}
    onMouseDown={(event) => event.preventDefault()}>
    {showSuggestions && <div className={styles.predictions} aria-hidden="true">{suggestions.map((text, index) => <span key={index}>{text}</span>)}</div>}
    <div className={styles.keys}>
      <div className={styles.row}>{letters(numeric ? "1234567890" : letterCase("QWERTYUIOP"))}</div>
      <div className={`${styles.row} ${numeric ? "" : styles.middle}`}>{letters(numeric ? '-/:;()$&@"' : letterCase("ASDFGHJKL"))}</div>
      <div className={styles.lowerRow}>
        <span className={`${styles.key} ${styles.symbolKey}`} aria-hidden="true">{numeric ? <span className={styles.numericSwitch}>#+=</span> : shift}</span>
        <div className={styles.bottomLetters}>{letters(numeric ? ".,?!’" : letterCase("ZXCVBNM"))}</div>
        {key("Delete character", <Artwork light={assets.delete} dark={assets.deleteDark} />, `${styles.key} ${styles.symbolKey}`, onDelete)}
      </div>
      <div className={styles.spaceRow}>
        <span className={`${styles.key} ${styles.layoutKey}`} aria-hidden="true">{numeric ? "ABC" : "123"}</span>
        {key("Space", null, styles.key, onType ? () => onType(" ") : undefined)}
        {key(returnKey === "return" ? "Return" : returnKey === "search" ? "Search" : "Done",
          returnKey === "return" ? <Artwork light={assets.return} dark={assets.returnDark} /> : returnKey === "search" ? "search" : "done",
          `${styles.key} ${styles.returnKey} ${returnKey !== "return" ? styles.prominent : ""}`, onReturn)}
      </div>
    </div>
    <div className={styles.utilities} aria-hidden="true">
      <span><Artwork light={assets.emoji} dark={assets.emojiDark} /></span>
      <span><Artwork light={assets.dictation} dark={assets.dictationDark} /></span>
    </div>
    {showHomeIndicator && <IOSHomeIndicator placement="overlay" />}
  </div>;
}
