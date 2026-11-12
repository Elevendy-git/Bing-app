import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { Avatar, BingSearchBox, GlanceCardGroup, IOSStatusBar, Toast, type AppFooterProps, type AvatarProps } from "../../components";
import { ScreenFooter } from "../ScreenFooter";
import type { GlanceCardItem } from "../../components/GlanceCard";
import type { FeedArticleOpenHandler } from "../../components/FeedCard";
import { HomepageFeed } from "./HomepageFeed";
import { LiveHomepageFeed } from "./LiveHomepageFeed";
import { HOMEPAGE_SCROLL_DOWN, HOMEPAGE_SEARCH_TRAVEL, useHomepageScrollSnap } from "./useHomepageScrollSnap";
import { FeedOptionsSheet } from "./FeedOptionsSheet";
import { useFeedFollow, type FeedOverlayState } from "./useFeedFollow";
import { iosMotion, iosMotionCss } from "../../motion/iosMotion";
import { MotionPresence } from "../../motion/MotionPresence";
import styles from "./Homepage.module.css";

const sunny = new URL("./assets/sunny.svg", import.meta.url).href;

const SEARCH_COLLAPSE_TRAVEL = 96;
const GLANCE_GAP = 63;
const INITIAL_SCROLL_OFFSETS = { top: 0, scrolled: HOMEPAGE_SCROLL_DOWN } as const;

// Keep the existing UIScrollView-like coordinated content/composer behavior:
// https://developer.apple.com/documentation/uikit/uiscrollview
// https://developer.apple.com/design/human-interface-guidelines/motion
// Rechecked 12 November 2026. Apple documents gesture continuity and cancellation,
// not these dimensions. The 72px preferred minimum, 440px reserve, 228px minimum
// chrome/composer space and 16px gap are spatial tuning for short web canvases;
// existing iosMotion timings remain unchanged.
function homepageGeometry(height: number) {
  const preferredTravel = Math.max(72, Math.round(height - 440));
  const availableTravel = Math.max(8, Math.round(height - 228));
  const searchTravel = height > 0 ? Math.min(HOMEPAGE_SEARCH_TRAVEL, preferredTravel, availableTravel) : HOMEPAGE_SEARCH_TRAVEL;
  const glanceGap = Math.max(16, Math.round(GLANCE_GAP * searchTravel / HOMEPAGE_SEARCH_TRAVEL));
  // Keep the docked Glance/feed at y=138/238 as the initial hero gets shorter.
  const scrollDown = searchTravel + glanceGap + HOMEPAGE_SCROLL_DOWN - HOMEPAGE_SEARCH_TRAVEL - GLANCE_GAP;
  return { searchTravel, glanceGap, scrollDown };
}

const homepageGlanceCards: readonly GlanceCardItem[] = [
  { id: "rewards", variant: "rewards" },
  { id: "sports", variant: "sports" },
  { id: "create", variant: "create" },
  { id: "money", variant: "money" },
];

export interface HomepageProps {
  /** The key screen uses the design's fixed time; prototypes may use the device clock. */
  timeSource?: "fixed" | "system";
  feedSource?: "preview" | "msn";
  interactiveFeed?: boolean;
  /** Passive Figma presets for the feed menu and its confirmation toasts. */
  initialFeedOverlay?: FeedOverlayState;
  /** Initial Figma position; all presets remain fully scrollable. */
  initialState?: keyof typeof INITIAL_SCROLL_OFFSETS;
  /** Private mode changes only the identity avatar on Homepage. */
  privateMode?: boolean;
  onNavigate?: AppFooterProps["onSelectedTabChange"];
  onOpenSearch?: () => void;
  onVoiceSearch?: () => void;
  onOpenProfile?: () => void;
  /** Opens the official Rewards site using the host prototype's browser action. */
  onViewRewards?: () => void;
  onOpenArticle?: FeedArticleOpenHandler;
  profileAvatar?: AvatarProps;
  /** The live Search composer takes over during the shared transition. */
  searchConcealed?: boolean;
  /** Pause automatic settling while another screen owns navigation. */
  scrollSnapEnabled?: boolean;
}

/** Homepage shares one persistent input above the scrolling content and its fade mask. */
export function Homepage({ timeSource = "fixed", feedSource = "preview", interactiveFeed = false, initialFeedOverlay, initialState = "top", privateMode = false, onNavigate, onOpenSearch, onVoiceSearch, onOpenProfile, onViewRewards, onOpenArticle, profileAvatar, searchConcealed = false, scrollSnapEnabled = true }: HomepageProps) {
  const feedActions = useFeedFollow(initialFeedOverlay);
  const reducedMotion = useReducedMotion();
  const toastMotion = interactiveFeed && !reducedMotion ? iosMotion.toast : iosMotion.instant;
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchSlotRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const geometry = homepageGeometry(canvasHeight);
  const geometryRef = useRef(geometry);
  const lastSearchOffset = useRef<number>();
  const [isScrolled, setIsScrolled] = useState(initialState === "scrolled");
  const scrolledRef = useRef(isScrolled);
  const syncSearchPosition = useCallback((position: number) => {
    const slot = searchSlotRef.current;
    const { searchTravel } = geometryRef.current;
    const offset = Math.max(0, Math.min(searchTravel, position));
    if (!slot || offset === lastSearchOffset.current) return;
    lastSearchOffset.current = offset;
    const collapseTravel = Math.min(SEARCH_COLLAPSE_TRAVEL, searchTravel);
    const progress = Math.max(0, (offset - (searchTravel - collapseTravel)) / collapseTravel);
    const collapse = progress * progress * (3 - 2 * progress);
    // Position and height share the scroll frame. React only updates at the dock
    // boundary, so the entire feed is not reconciled for each motion sample.
    slot.style.transform = `translateY(${searchTravel - offset}px)`;
    slot.style.setProperty("--gnrc-homepage-composer-height", `${64 - 8 * collapse}px`);
    const scrolled = offset === searchTravel;
    if (scrolledRef.current !== scrolled) {
      scrolledRef.current = scrolled;
      setIsScrolled(scrolled);
    }
  }, []);
  const scrollToTop = useHomepageScrollSnap(scrollRef, syncSearchPosition,
    scrollSnapEnabled && !searchConcealed && !feedActions.menuPresented, geometry);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      // Hidden workbench views have no layout. Retain their last usable geometry.
      if (root.clientHeight > 0) setCanvasHeight(root.clientHeight);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(root);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  useLayoutEffect(() => {
    const content = scrollRef.current;
    const previous = geometryRef.current;
    geometryRef.current = geometry;
    if (!content) return;
    const position = content.scrollTop;
    if (previous.searchTravel !== geometry.searchTravel || previous.scrollDown !== geometry.scrollDown) {
      // Keep hero progress or the same feed location, including after a hidden
      // view returns. Resizing must not restore the initial preset or remount it.
      content.scrollTop = position <= previous.searchTravel
        ? position * geometry.searchTravel / previous.searchTravel
        : position < previous.scrollDown
          ? geometry.searchTravel + (position - previous.searchTravel)
            * (geometry.scrollDown - geometry.searchTravel) / (previous.scrollDown - previous.searchTravel)
          : geometry.scrollDown + position - previous.scrollDown;
    }
    lastSearchOffset.current = undefined;
    syncSearchPosition(content.scrollTop);
  }, [geometry.searchTravel, geometry.scrollDown, syncSearchPosition]);

  useLayoutEffect(() => {
    const content = scrollRef.current;
    if (!content) return;
    const offset = initialState === "scrolled" ? geometryRef.current.scrollDown : 0;
    const applyInitialPosition = () => {
      content.scrollTop = offset;
      // A closed dialog or hidden workbench view has no scrollable layout yet.
      if (Math.abs(content.scrollTop - offset) > 1) return false;
      syncSearchPosition(content.scrollTop);
      return true;
    };
    if (applyInitialPosition()) return;
    const observer = new ResizeObserver(() => {
      if (applyInitialPosition()) observer.disconnect();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [initialState, syncSearchPosition]);

  const avatar = <Avatar {...profileAvatar} variant={privateMode ? "private" : profileAvatar?.variant ?? "image"} size="default" />;

  return (
    <main ref={rootRef} className={`${styles.root} ${isScrolled ? styles.scrolled : ""}`} aria-label="Bing homepage"
      style={{ ...iosMotionCss, "--gnrc-homepage-hero-height": `${geometry.searchTravel}px`,
        "--gnrc-homepage-glance-gap": `${geometry.glanceGap}px` } as CSSProperties}
      data-live-motion={!reducedMotion && Boolean(onNavigate) || undefined}
      data-compact-hero={geometry.searchTravel < 72 || undefined}>
      <div className={styles.scene} aria-hidden={feedActions.menuPresented || undefined} {...(feedActions.menuPresented ? { inert: "" } : {})}>
        <div className={styles.wallpaper} aria-hidden="true" />
        <div className={styles.searchBackdrop} aria-hidden="true" />
        <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
        <div ref={searchSlotRef} className={`${styles.searchSlot} ${searchConcealed ? styles.searchConcealed : ""}`}>
          <BingSearchBox className={styles.searchBox} compact={isScrolled} onOpenSearch={onOpenSearch} onVoiceSearch={onVoiceSearch} />
        </div>
        <div ref={scrollRef} className={styles.scrollContent} role="region" aria-label="Homepage content" tabIndex={0}
          onScroll={(event) => { if (event.target === event.currentTarget) syncSearchPosition(event.currentTarget.scrollTop); }}>
          <div className={styles.hero}>
            <header className={styles.titleBar}>
              {onOpenProfile ? <button type="button" className={styles.profileButton} aria-label="Open Profile" onClick={onOpenProfile}>{avatar}</button> : avatar}
              <div className={styles.weather} aria-label="Sunny, 56 degrees Fahrenheit">
                <span>56°F</span>
                <span className={styles.weatherIcon}><img src={sunny} alt="" /></span>
              </div>
            </header>
          </div>
          <div className={styles.searchSpacer} aria-hidden="true" />
          <GlanceCardGroup items={homepageGlanceCards} className={styles.glanceCards}
            onCardClick={id => { if (id === "rewards") onViewRewards?.(); }} />
          {feedSource === "msn" ? <LiveHomepageFeed scrollRef={scrollRef} active={scrollSnapEnabled && !searchConcealed && !feedActions.menuPresented}
            onOpenArticle={onOpenArticle}
            onMoreOptions={interactiveFeed ? feedActions.openMenu : undefined} />
            : <HomepageFeed onMoreOptions={interactiveFeed ? feedActions.openMenu : undefined} />}
        </div>
        <ScreenFooter selectedTab={onNavigate ? "home" : undefined} onSelectedTabChange={destination => {
          if (destination === "home") scrollToTop();
          onNavigate?.(destination);
        }}
          labels={onNavigate ? { collections: "Recent" } : undefined} />
      </div>
      <AnimatePresence initial={false} onExitComplete={feedActions.finishClose}>
        {feedActions.menu && <FeedOptionsSheet key="feed-menu" target={feedActions.menu} followed={feedActions.isFollowed(feedActions.menu)}
          interactive={interactiveFeed} onDismiss={interactiveFeed ? feedActions.closeMenu : undefined}
          onToggleFollow={interactiveFeed ? feedActions.toggleFollow : undefined} />}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!feedActions.menuPresented && feedActions.toast && <MotionPresence key={feedActions.toast.id} className={styles.feedToast}
          initial={interactiveFeed && !reducedMotion ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }} transition={toastMotion}>
          <Toast message={feedActions.toast.message} actionLabel="Undo" className={styles.toastCard}
            onAction={interactiveFeed ? feedActions.undo : undefined} onDismiss={interactiveFeed ? feedActions.dismissToast : undefined} />
        </MotionPresence>}
      </AnimatePresence>
    </main>
  );
}
