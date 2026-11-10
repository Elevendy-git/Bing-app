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

// Search starts 332 px below the status safe area. Clamp its position independently
// of the native scroll surface so edge overscroll can never move the pinned input.
const SEARCH_STICKY_OFFSET = HOMEPAGE_SEARCH_TRAVEL;
const SEARCH_COLLAPSE_TRAVEL = 96;
const INITIAL_SCROLL_OFFSETS = { top: 0, scrolled: HOMEPAGE_SCROLL_DOWN } as const;
const headerOffset = (scrollTop: number) => Math.max(0, Math.min(SEARCH_STICKY_OFFSET, scrollTop));

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchSlotRef = useRef<HTMLDivElement>(null);
  const lastSearchOffset = useRef<number>();
  const [isScrolled, setIsScrolled] = useState(initialState === "scrolled");
  const scrolledRef = useRef(isScrolled);
  const syncSearchPosition = useCallback((position: number) => {
    const slot = searchSlotRef.current;
    const offset = headerOffset(position);
    if (!slot || offset === lastSearchOffset.current) return;
    lastSearchOffset.current = offset;
    const progress = Math.max(0, (offset - (SEARCH_STICKY_OFFSET - SEARCH_COLLAPSE_TRAVEL)) / SEARCH_COLLAPSE_TRAVEL);
    const collapse = progress * progress * (3 - 2 * progress);
    // Position and height share the scroll frame. React only updates at the dock
    // boundary, so the entire feed is not reconciled for each motion sample.
    slot.style.transform = `translateY(${SEARCH_STICKY_OFFSET - offset}px)`;
    slot.style.setProperty("--gnrc-homepage-composer-height", `${64 - 8 * collapse}px`);
    const scrolled = offset === SEARCH_STICKY_OFFSET;
    if (scrolledRef.current !== scrolled) {
      scrolledRef.current = scrolled;
      setIsScrolled(scrolled);
    }
  }, []);
  const scrollToTop = useHomepageScrollSnap(scrollRef, syncSearchPosition, scrollSnapEnabled && !searchConcealed && !feedActions.menuPresented);

  useLayoutEffect(() => {
    const content = scrollRef.current;
    if (!content) return;
    const offset = INITIAL_SCROLL_OFFSETS[initialState];
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
    <main className={`${styles.root} ${isScrolled ? styles.scrolled : ""}`} aria-label="Bing homepage"
      style={iosMotionCss as CSSProperties} data-live-motion={!reducedMotion && Boolean(onNavigate) || undefined}>
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
