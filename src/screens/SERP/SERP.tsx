import { MoreHorizontal24Regular } from "@fluentui/react-icons";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, useIsPresent, useReducedMotion } from "motion/react";
import { AppSearchBox, type AppSearchBoxProps } from "../../components/AppSearchBox";
import { IABFooter, type IABFooterProps } from "../../components/IABFooter";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import { BrowserMenu, type BrowserMenuAction } from "../../components/BrowserMenu";
import { MenuSheet } from "../../components/MenuList/MenuSheet";
import { Toast } from "../../components/Toast";
import { MotionPresence, useOverlayPresence } from "../../motion/MotionPresence";
import { iosMotion } from "../../motion/iosMotion";
import { bingSearchUrl } from "../../services/bingPage";
import { FindOnPage, type FindOnPageState } from "./FindOnPage";
import { BING_FEEDBACK_URL, BING_SEARCH_SETTINGS_URL, copyBrowserLink, openBrowserLink, shareBrowserLink } from "./browserActions";
import styles from "./SERP.module.css";

export interface SERPProps extends Omit<IABFooterProps, "className">,
  Pick<AppSearchBoxProps, "loadState" | "loadKey" | "animateLoading" | "onVoiceSearch"> {
  query?: string;
  timeSource?: "fixed" | "system";
  onEditQuery?: () => void;
  active?: boolean;
  /** Search owns the visible field during its shared-composer transition. */
  searchConcealed?: boolean;
  /** Web-owned content. Omitting it renders the original Figma reference in Key screens. */
  webContent?: ReactNode;
  webPage?: boolean;
  privateMode?: boolean;
  pageUrl?: string;
  pageTitle?: string;
  bookmarked?: boolean;
  onToggleBookmark?: () => boolean;
  onRefresh?: () => void;
  onFindOnPage?: () => void;
  find?: FindOnPageState;
  onSearchSettings?: () => void;
  onFeedback?: () => void;
  initialMenuOpen?: boolean;
}

/** The App owns only the chrome; Bing owns everything inside the central viewport. */
export function SERP({ query = "Weather", timeSource = "fixed", onEditQuery, onVoiceSearch, active = true, searchConcealed = false, webContent, webPage = false, privateMode = false, loadState, loadKey, animateLoading,
  pageUrl, pageTitle, bookmarked = false, onToggleBookmark, onRefresh, onFindOnPage, find, onSearchSettings, onFeedback, initialMenuOpen = false, ...navigation }: SERPProps) {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const enabled = active && isPresent;
  const interactive = Boolean(onRefresh || onEditQuery || navigation.onBack);
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const [notice, setNotice] = useState<{ id: number; message: string; tone: "success" | "information" } | null>(null);
  const noticeSequence = useRef(0);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const latestEnabled = useRef(enabled); latestEnabled.current = enabled;
  const menu = useOverlayPresence(menuOpen, () => {
    const next = pendingAction.current; pendingAction.current = null;
    if (!latestEnabled.current) return;
    if (next) next(); else menuTrigger.current?.focus({ preventScroll: true });
  });
  const findPresence = useOverlayPresence(Boolean(find), () => {
    if (latestEnabled.current) menuTrigger.current?.focus({ preventScroll: true });
  });
  useLayoutEffect(() => {
    if (!enabled) { setMenuOpen(false); pendingAction.current = null; setNotice(null); ++noticeSequence.current; }
  }, [enabled]);
  const showNotice = (message: string, tone: "success" | "information" = "success") => {
    if (latestEnabled.current) setNotice({ id: ++noticeSequence.current, message, tone });
  };
  const selectAction = async (action: BrowserMenuAction) => {
    if (!enabled) return;
    setMenuOpen(false);
    const url = pageUrl ?? (webPage ? query : bingSearchUrl(query));
    const request = ++noticeSequence.current;
    try {
      if (action === "refresh") onRefresh?.();
      if (action === "copy-link") { await copyBrowserLink(url); if (request === noticeSequence.current) showNotice("Link copied"); }
      if (action === "open-in-default-browser") openBrowserLink(url);
      if (action === "share") {
        const result = await shareBrowserLink(url, pageTitle);
        if (request === noticeSequence.current && result === "copied") showNotice("Link copied. You can share it.");
      }
      if (action === "search-settings") (onSearchSettings ?? (() => openBrowserLink(BING_SEARCH_SETTINGS_URL)))();
      if (action === "feedback") (onFeedback ?? (() => openBrowserLink(BING_FEEDBACK_URL)))();
      if (action === "find-on-page") pendingAction.current = onFindOnPage ?? null;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (request === noticeSequence.current) showNotice("This action couldn’t finish. Please try again.", "information");
    }
  };
  return <main className={styles.root} aria-label={webPage ? "In-app browser" : "Search results"} data-private-mode={privateMode}
    aria-hidden={!active || !isPresent || undefined} {...(!active || !isPresent ? { inert: "" } : {})}>
    <div className={styles.surface} aria-hidden={menu.presented || undefined} {...(menu.presented ? { inert: "" } : {})}>
    <header className={styles.header} data-product={privateMode ? "consumer" : undefined} data-theme={privateMode ? "dark" : undefined} data-private-mode={privateMode}>
      <IOSStatusBar timeSource={timeSource} tone={privateMode ? "light" : "inherit"} />
      <div className={styles.searchRow}>
        <AppSearchBox variant="serp" className={`${styles.search} ${searchConcealed ? styles.searchConcealed : ""}`} state="input" value={query}
          webPage={webPage} bookmarked={bookmarked} ariaLabel={webPage ? "Webpage address" : "Search results search box"}
          onToggleBookmark={enabled && onToggleBookmark ? () => {
            if (privateMode) { showNotice("Bookmarks aren’t saved in InPrivate", "information"); return; }
            const saved = onToggleBookmark(); showNotice(saved ? "Saved to bookmarks" : "Bookmark removed");
          } : undefined}
          loadState={loadState} loadKey={loadKey} animateLoading={animateLoading}
          onVoiceSearch={active && isPresent ? onVoiceSearch : undefined}
          inputProps={onEditQuery ? { "aria-label": "Edit search query", readOnly: true, inputMode: "none", onClick: onEditQuery,
            onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEditQuery(); } } } : undefined} />
        {interactive ? <button ref={menuTrigger} type="button" className={styles.more} aria-label="More options" aria-haspopup="dialog"
          aria-expanded={menuOpen} disabled={!enabled} onClick={() => setMenuOpen(true)}><MoreHorizontal24Regular /></button>
          : <span className={styles.more} role="img" aria-label="More"><MoreHorizontal24Regular /></span>}
      </div>
    </header>
    <section className={styles.viewport} aria-label={webPage ? "Web page" : "Bing results"} aria-busy={loadState === "loading" || loadState === "rendering"}
      data-serp-source={webContent ? "web" : "design-reference"}>
      {webContent ?? <img className={styles.reference} src={new URL("./assets/bing-weather-reference.png", import.meta.url).href}
        alt="Bing weather results — Figma design reference" draggable={false} />}
    </section>
    <div className={styles.footer}>
      <AnimatePresence mode="wait" onExitComplete={findPresence.finishExit}>
        {find ? <FindOnPage key="find" state={find} active={enabled && !menu.presented} />
          : <IABFooter key="browser-footer" {...navigation} navigationLabel={navigation.navigationLabel ?? (webPage ? "In-app browser navigation" : undefined)} />}
      </AnimatePresence>
      <IOSHomeIndicator />
    </div>
    </div>
    <div className={styles.overlayHost} data-product={privateMode ? "consumer" : undefined} data-theme={privateMode ? "dark" : undefined}>
      <AnimatePresence onExitComplete={menu.finishExit}>
        {menuOpen && <MenuSheet key="browser-menu" label={webPage ? "Webpage options" : "Search results options"}
          interactive={interactive} onDismiss={() => setMenuOpen(false)}>
          <BrowserMenu variant={webPage ? "webpage" : "serp"} autoFocus={interactive}
            onDismiss={interactive ? () => setMenuOpen(false) : undefined} onAction={interactive ? selectAction : undefined} />
        </MenuSheet>}
      </AnimatePresence>
      <AnimatePresence>
        {!menu.presented && notice && <MotionPresence key={notice.id} className={styles.toast}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }} transition={reducedMotion ? iosMotion.instant : iosMotion.toast}>
          <Toast message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />
        </MotionPresence>}
      </AnimatePresence>
    </div>
  </main>;
}
