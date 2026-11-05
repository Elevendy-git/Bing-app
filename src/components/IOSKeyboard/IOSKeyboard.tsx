import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IOSHomeIndicator } from "../IOSHomeIndicator";
import { getIOSKeyboardHeight, type IOSAppearance } from "../IOSNative/iosMetrics";
import { iosKeyboardInteraction } from "../../motion/iosMotion";
import { EMOJI_CATEGORIES } from "./emoji";
import { useKeyboardDictation } from "./useKeyboardDictation";
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

export type IOSKeyboardLayout = "uppercase" | "lowercase" | "numeric" | "symbols" | "emoji";
export type IOSKeyboardReturnKey = "return" | "search" | "done";
export interface IOSKeyboardProps {
  appearance?: IOSAppearance;
  /** Fixed passive state; initial layout when onType enables the interactive keyboard. */
  layout?: IOSKeyboardLayout;
  returnKey?: IOSKeyboardReturnKey;
  showSuggestions?: boolean;
  suggestions?: readonly [string, string, string];
  /** Current input controls automatic capitalization; key presses preserve exact case. */
  value?: string;
  /** Hidden/outgoing keyboards must stop recognition and ignore late results. */
  active?: boolean;
  onType?: (letter: string) => void;
  onDelete?: () => void;
  onReturn?: () => void;
  onSelectSuggestion?: (value: string) => void;
  onDictation?: (transcript: string) => void;
  /** Screens keep one stationary indicator above the sliding keyboard. */
  showHomeIndicator?: boolean;
}

function Artwork({ light, dark }: { light: string; dark: string }) {
  return <><img className={styles.lightArtwork} src={light} alt="" /><img className={styles.darkArtwork} src={dark} alt="" /></>;
}

/** Interactive web keyboard using iOS artwork; callback-free Library specimens stay passive. */
export function IOSKeyboard({ appearance = "auto", layout = "uppercase", returnKey = "return", showSuggestions = true,
  suggestions, value, active = true,
  onType, onDelete, onReturn, onSelectSuggestion, onDictation, showHomeIndicator = true }: IOSKeyboardProps) {
  type Surface = "letters" | "numeric" | "symbols" | "emoji";
  type Shift = "auto" | "off" | "once" | "locked";
  const interactive = Boolean(onType);
  const predictions = suggestions ?? (interactive ? ["", "", ""] : ["Design", "Designs", "Designed"]);
  const [surface, setSurface] = useState<Surface>(layout === "uppercase" || layout === "lowercase" ? "letters" : layout);
  const [shiftMode, setShiftMode] = useState<Shift>(layout === "lowercase" ? "off" : "auto");
  const [category, setCategory] = useState(0);
  const lastShiftTap = useRef<number | null>(null);
  const currentSurface = interactive ? surface : layout === "uppercase" || layout === "lowercase" ? "letters" : layout;
  const uppercase = interactive ? shiftMode === "once" || shiftMode === "locked" || (shiftMode === "auto" && !value) : layout === "uppercase";
  const displayedLayout = currentSurface === "letters" ? uppercase ? "uppercase" : "lowercase" : currentSurface;
  const dictation = useKeyboardDictation(interactive && active, onDictation ?? onType);
  const key = (label: string, content: ReactNode, className: string, action?: () => void) => action ? (
    <button key={label} type="button" className={className} aria-label={label} onClick={() => { if (active) action(); }}>{content}</button>
  ) : <span key={label} className={className} aria-hidden="true">{content}</span>;
  const type = (letter: string) => {
    lastShiftTap.current = null;
    dictation.clearStatus();
    onType?.(letter);
    if (/^[a-z]$/i.test(letter) && shiftMode !== "locked") setShiftMode(value === undefined ? "off" : "auto");
    if (letter === " " && (surface === "numeric" || surface === "symbols")) setSurface("letters");
  };
  const letters = (row: string) => Array.from(row, letter => key(letter, <span className={styles.letter}>{letter}</span>, styles.key, onType ? () => type(letter) : undefined));
  const changeSurface = (next: Surface) => { lastShiftTap.current = null; dictation.clearStatus(); setSurface(next); };
  const toggleShift = () => {
    const now = Date.now();
    if (shiftMode === "locked") { setShiftMode("off"); lastShiftTap.current = null; }
    else if (lastShiftTap.current !== null && now - lastShiftTap.current <= iosKeyboardInteraction.doubleTapWindowMs) {
      setShiftMode("locked"); lastShiftTap.current = null;
    } else { setShiftMode(uppercase ? "off" : "once"); lastShiftTap.current = now; }
  };
  const numeric = currentSurface === "numeric", symbols = currentSurface === "symbols", emoji = currentSurface === "emoji";
  const letterCase = (row: string) => uppercase ? row : row.toLowerCase();
  const shift = !uppercase
    ? <span className={styles.shiftOutline} style={{ "--gnrc-ios-shift-artwork": `url("${assets.shiftOff}")` } as CSSProperties} />
    : <Artwork light={assets.shift} dark={assets.shiftDark} />;
  const deleteKey = key("Delete character", <Artwork light={assets.delete} dark={assets.deleteDark} />, `${styles.key} ${styles.symbolKey}`, onDelete);
  const categoryControls = <div className={styles.emojiCategories} role="group" aria-label="Emoji categories">
    {EMOJI_CATEGORIES.map((item, index) => interactive
      ? <button type="button" key={item.name} aria-label={item.name} aria-pressed={category === index}
          onClick={() => { if (active) setCategory(index); }}>{item.icon}</button>
      : <span key={item.name}>{item.icon}</span>)}
  </div>;
  return <div className={styles.root} role="group" aria-label="iOS keyboard" data-ios-keyboard="27" data-layout={displayedLayout}
    data-caps-lock={interactive && shiftMode === "locked" || undefined}
    data-ios-appearance={appearance === "auto" ? undefined : appearance}
    style={{ "--gnrc-ios-keyboard-height": `${getIOSKeyboardHeight(showSuggestions)}px` } as CSSProperties}
    onPointerDown={(event) => event.preventDefault()}
    onMouseDown={(event) => event.preventDefault()}>
    {showSuggestions && (emoji ? categoryControls : <div className={styles.predictions} role="group" aria-label="Keyboard suggestions">
      {predictions.map((text, index) => text && onSelectSuggestion
        ? <button type="button" key={index} aria-label={`Use suggestion: ${text}`} title={text}
            onClick={() => { if (active) onSelectSuggestion(text); }}><span>{index === 0 ? `“${text}”` : text}</span></button>
        : <span key={index} aria-hidden="true">{text ? index === 0 ? `“${text}”` : text : ""}</span>)}
    </div>)}
    {dictation.status && <div className={styles.dictationStatus} role="status">{dictation.status}</div>}
    <div className={styles.keys}>
      {emoji ? <div className={styles.emojiGrid} role="group" aria-label={`${EMOJI_CATEGORIES[category].name} emoji`}>
        {EMOJI_CATEGORIES[category].items.map(item => key(`Insert ${item}`, item, styles.emojiKey, onType ? () => type(item) : undefined))}
        {deleteKey}
      </div> : <>
      <div className={styles.row}>{letters(numeric ? "1234567890" : symbols ? "[]{}#%^*+=" : letterCase("QWERTYUIOP"))}</div>
      <div className={`${styles.row} ${numeric || symbols ? "" : styles.middle}`}>{letters(numeric ? '-/:;()$&@"' : symbols ? "_\\|~<>€£¥•" : letterCase("ASDFGHJKL"))}</div>
      <div className={styles.lowerRow}>
        {numeric || symbols ? key(symbols ? "Show numbers" : "Show symbols", <span className={styles.numericSwitch}>{symbols ? "123" : "#+="}</span>, `${styles.key} ${styles.symbolKey}`,
          interactive ? () => changeSurface(symbols ? "numeric" : "symbols") : undefined)
          : interactive ? <button type="button" className={`${styles.key} ${styles.symbolKey} ${shiftMode === "locked" ? styles.capsLock : ""}`}
              aria-label="Shift" aria-pressed={uppercase} title={shiftMode === "locked" ? "Caps Lock on" : "Shift; double-tap for Caps Lock"}
              onClick={() => { if (active) toggleShift(); }}>{shift}</button>
            : <span className={`${styles.key} ${styles.symbolKey}`} aria-hidden="true">{shift}</span>}
        <div className={styles.bottomLetters}>{letters(numeric || symbols ? ".,?!’" : letterCase("ZXCVBNM"))}</div>
        {deleteKey}
      </div>
      </>}
      <div className={styles.spaceRow}>
        {key(numeric || symbols || emoji ? "Show letters" : "Show numbers", numeric || symbols || emoji ? "ABC" : "123",
          `${styles.key} ${styles.layoutKey}`, interactive ? () => changeSurface(numeric || symbols || emoji ? "letters" : "numeric") : undefined)}
        {key("Space", null, styles.key, onType ? () => type(" ") : undefined)}
        {key(returnKey === "return" ? "Return" : returnKey === "search" ? "Search" : "Done",
          returnKey === "return" ? <Artwork light={assets.return} dark={assets.returnDark} /> : returnKey === "search" ? "search" : "done",
          `${styles.key} ${styles.returnKey} ${returnKey !== "return" ? styles.prominent : ""}`, onReturn)}
      </div>
    </div>
    <div className={styles.utilities}>
      {key(emoji ? "Show letter keyboard" : "Show emoji keyboard", <Artwork light={assets.emoji} dark={assets.emojiDark} />, styles.utilityKey,
        interactive ? () => changeSurface(emoji ? "letters" : "emoji") : undefined)}
      {interactive ? <button type="button" className={styles.utilityKey} aria-label={dictation.listening ? "Stop dictation" : "Start dictation"}
        aria-pressed={dictation.listening} onClick={dictation.toggle}><Artwork light={assets.dictation} dark={assets.dictationDark} /></button>
        : <span className={styles.utilityKey} aria-hidden="true"><Artwork light={assets.dictation} dark={assets.dictationDark} /></span>}
    </div>
    {showHomeIndicator && <IOSHomeIndicator placement="overlay" />}
  </div>;
}
