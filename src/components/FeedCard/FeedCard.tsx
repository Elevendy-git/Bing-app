import {
  MoreHorizontal24Regular,
  Play24Filled,
  Send24Regular,
} from "@fluentui/react-icons";
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type MouseEventHandler,
} from "react";
import {
  FEED_CARD_AD_IMAGE,
  FEED_CARD_MULTI_IMAGE,
  FEED_CARD_SINGLE_IMAGE,
  FEED_CARD_WATCH_IMAGE,
} from "./FeedCard.assets";
import styles from "./FeedCard.module.css";

export type FeedCardVariant = "single" | "watch" | "multi" | "ad" | "loading";

export interface FeedFollowTarget {
  kind: "publisher" | "topic";
  name: string;
  /** Stable provider/channel ID when available; otherwise the normalized name is used. */
  id?: string;
}

export type FeedMoreOptionsHandler = (target: FeedFollowTarget, trigger: HTMLButtonElement) => void;

export interface FeedCardItem {
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  publisher: string;
  publisherLogoSrc?: string | null;
  elapsedTime: string;
  title: string;
  /** Topic/channel cards may override the default publisher target. */
  followTarget?: FeedFollowTarget;
}

export interface FeedCardProps {
  /** Layout and media proportions can be set by an embedding screen. */
  className?: string;
  mediaAspectRatio?: number;
  /** Visual form from the Figma Feed Cards component set. */
  variant?: FeedCardVariant;
  /** Article image. The matching bundled Figma example is used when omitted. */
  imageSrc?: string;
  /** Accessible description for the article image. */
  imageAlt?: string;
  /** Focal position supplied by live media metadata; defaults to centered artwork. */
  imagePosition?: string;
  /** Publisher displayed in the attribution row. */
  publisher?: string;
  /** Omitted uses the design mark; null means the data source supplied no logo. */
  publisherLogoSrc?: string | null;
  /** Relative publish time. */
  elapsedTime?: string;
  /** Two-line article headline. */
  title?: string;
  /** Optional data set for the Multi-cards carousel. */
  slides?: FeedCardItem[];
  /** Optional controlled slide supplied by an embedding screen. */
  activeSlideIndex?: number;
  onActiveSlideChange?: (index: number) => void;
  followTarget?: FeedFollowTarget;
  onMoreOptions?: FeedMoreOptionsHandler;
}

const DEFAULT_CONTENT: Record<Exclude<FeedCardVariant, "loading">, FeedCardItem> = {
  single: {
    imageSrc: FEED_CARD_SINGLE_IMAGE,
    imageAlt: "Two Adirondack chairs facing a quiet ocean",
    publisher: "Travel + Leisure",
    elapsedTime: "31m",
    title: "7 Quiet Beach Towns That Are Even Better After Summer Ends",
  },
  multi: {
    imageSrc: FEED_CARD_SINGLE_IMAGE,
    imageAlt: "Two Adirondack chairs facing a quiet ocean",
    publisher: "Condé Nast Traveler",
    elapsedTime: "52m",
    title: "The Seaside Towns Keeping Summer Going Long After Labor Day",
  },
  ad: {
    imageSrc: FEED_CARD_AD_IMAGE,
    imageAlt: "Colorful collectible characters standing on a surreal landscape",
    publisher: "POP MART",
    elapsedTime: "2h",
    title: "Meet the Monsters: A Colorful New Collection Has Landed",
  },
  watch: {
    imageSrc: FEED_CARD_WATCH_IMAGE,
    imageAlt: "Sunlight streaming through a rainforest beside a river",
    publisher: "BBC Earth",
    elapsedTime: "48m",
    title: "Watch: A Rare Dawn Chorus Returns to the Restored Rainforest",
  },
};

const DEFAULT_MULTI_SLIDES: FeedCardItem[] = [
  DEFAULT_CONTENT.multi,
  {
    imageSrc: FEED_CARD_WATCH_IMAGE,
    imageAlt: "Sunlight streaming through a rainforest beside a river",
    publisher: "National Geographic",
    elapsedTime: "2h",
    title: "The Rainforest Corridor Bringing Wildlife Back to the River",
  },
  {
    imageSrc: FEED_CARD_MULTI_IMAGE,
    imageAlt: "Colorful illustration of people walking in different directions",
    publisher: "Fast Company",
    elapsedTime: "2h",
    title: "Why Walking Meetings Are Finding Their Way Back Into the Workday",
  },
  {
    imageSrc: FEED_CARD_AD_IMAGE,
    imageAlt: "Colorful collectible characters standing on a surreal landscape",
    publisher: "Hypebeast",
    elapsedTime: "3h",
    title: "How Collectible Art Toys Became This Year’s Surprise Design Obsession",
  },
];

const MULTI_SLIDE_GAP = 12;

function MediumMark() {
  return (
    <svg
      className={styles.publisherMark}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path
        d="M4.2 6.1v-.55h4.1l2.06 4.52 1.82-4.52h3.62v.55l-.95.73a.58.58 0 0 0-.22.55v5.25a.58.58 0 0 0 .22.54l.93.73v.55h-4.7v-.55l.96-.75c.1-.1.1-.13.1-.29V6.7l-2.66 6.74h-.71L5.68 6.7v5.18c-.03.3.07.61.28.83l1.25 1.19v.55H3.67v-.55l1.25-1.19c.2-.22.29-.53.25-.83V7.76a.73.73 0 0 0-.27-.68L4.2 6.1Z"
        fill="var(--gnrc-color-feed-card-surface)"
      />
    </svg>
  );
}

function YahooMark() {
  return (
    <span className={`${styles.publisherMark} ${styles.yahooMark}`} aria-hidden="true">
      y!
    </span>
  );
}

function FeedMedia({
  variant,
  imageSrc,
  imageAlt,
  imagePosition,
}: Pick<Required<FeedCardProps>, "variant" | "imageSrc" | "imageAlt"> & Pick<FeedCardProps, "imagePosition">) {
  if (variant === "loading") {
    return <div className={`${styles.media} ${styles.mediaSkeleton}`} aria-hidden="true" />;
  }

  return (
    <div className={styles.media}>
      <img className={styles.image} src={imageSrc} alt={imageAlt}
        style={imagePosition ? { objectPosition: imagePosition } : undefined} />
      {variant === "watch" ? (
        <span className={styles.playIndicator} aria-hidden="true">
          <Play24Filled />
        </span>
      ) : null}
    </div>
  );
}

function SkeletonBody() {
  return (
    <div className={styles.body} aria-hidden="true">
      <div className={styles.skeletonPublisher}>
        <span className={styles.skeletonCircle} />
        <span className={styles.skeletonPill} />
        <span className={styles.skeletonPill} />
      </div>
      <div className={styles.skeletonText}>
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
      </div>
    </div>
  );
}

function Pagination({
  activeIndex,
  count,
  onSelect,
}: {
  activeIndex: number;
  count: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.pagination} aria-label={`Slide ${activeIndex + 1} of ${count}`}>
      {Array.from({ length: count }, (_, index) => (
        <button
          className={
            index === activeIndex ? styles.paginationActive : styles.paginationDot
          }
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => onSelect(index)}
          key={index}
        />
      ))}
    </div>
  );
}

function CardBody({
  variant,
  publisher,
  publisherLogoSrc,
  elapsedTime,
  title,
  onMoreOptions,
}: Pick<Required<FeedCardProps>, "variant" | "publisher" | "elapsedTime" | "title"> &
  Pick<FeedCardProps, "publisherLogoSrc"> & { onMoreOptions?: MouseEventHandler<HTMLButtonElement> }) {
  return (
    <div className={styles.body}>
      <div className={styles.metaRow}>
        <span className={styles.metaGroup}>
          {variant === "ad" ? <span className={styles.adBadge}>Ad</span> : null}
          {publisherLogoSrc === null ? null : publisherLogoSrc ? (
            <img
              className={`${styles.publisherMark} ${styles.publisherLogo}`}
              src={publisherLogoSrc}
              alt=""
            />
          ) : variant === "ad" ? null : variant === "watch" ? (
            <YahooMark />
          ) : (
            <MediumMark />
          )}
          <span className={styles.metaText}>{publisher}</span>
          <span className={styles.metaText} aria-hidden="true">
            ·
          </span>
          <span className={styles.metaText}>{elapsedTime}</span>
        </span>

        <button
          className={styles.iconButton}
          type="button"
          aria-label={variant === "ad" ? "Open sponsored story" : "More options"}
          aria-haspopup={variant !== "ad" && onMoreOptions ? "dialog" : undefined}
          onClick={variant !== "ad" ? onMoreOptions : undefined}
        >
          {variant === "ad" ? <Send24Regular /> : <MoreHorizontal24Regular />}
        </button>
      </div>

      <div className={styles.titleSlot}>
        <h2 className={styles.title}>{title}</h2>
      </div>
    </div>
  );
}

function MultiCardCarousel({ slides, activeSlideIndex, onActiveSlideChange, onMoreOptions }: {
  slides: FeedCardItem[];
} & Pick<FeedCardProps, "activeSlideIndex" | "onActiveSlideChange" | "onMoreOptions">) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex ?? internalIndex));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const moveTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    if (activeSlideIndex === undefined) setInternalIndex(nextIndex);
    onActiveSlideChange?.(nextIndex);
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as Element).closest?.("button")) return;

    dragStartRef.current = event.clientX;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;

    let nextOffset = event.clientX - dragStartRef.current;
    const isPastStart = activeIndex === 0 && nextOffset > 0;
    const isPastEnd = activeIndex === slides.length - 1 && nextOffset < 0;
    if (isPastStart || isPastEnd) nextOffset *= 0.28;

    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (dragStartRef.current === null) return;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const width = viewportRef.current?.clientWidth ?? 318;
    const threshold = Math.min(56, width * 0.18);
    const offset = dragOffsetRef.current;
    let nextIndex = activeIndex;

    if (!cancelled && Math.abs(offset) >= threshold) {
      nextIndex += offset < 0 ? 1 : -1;
    }

    dragStartRef.current = null;
    setIsDragging(false);
    moveTo(nextIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(activeIndex + 1);
    }
  };

  const trackStyle = {
    transform: `translate3d(calc(-${activeIndex * 100}% - ${
      activeIndex * MULTI_SLIDE_GAP
    }px + ${dragOffset}px), 0, 0)`,
  } satisfies CSSProperties;

  return (
    <div className={styles.multiContainer}>
      <div
        className={`${styles.multiViewport} ${isDragging ? styles.isDragging : ""}`}
        ref={viewportRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Slide ${activeIndex + 1} of ${slides.length}: ${slides[activeIndex].title}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={(event) => finishDrag(event, true)}
      >
        <div
          className={`${styles.multiTrack} ${isDragging ? styles.trackDragging : ""}`}
          style={trackStyle}
        >
          {slides.map((slide, index) => (
            <div
              className={styles.multiSlide}
              aria-hidden={index !== activeIndex}
              {...(index !== activeIndex ? { inert: "" } : {})}
              key={`${slide.title}-${index}`}
            >
              <FeedMedia variant="multi" imageSrc={slide.imageSrc} imageAlt={slide.imageAlt} imagePosition={slide.imagePosition} />
              <CardBody
                variant="multi"
                publisher={slide.publisher}
                publisherLogoSrc={slide.publisherLogoSrc}
                elapsedTime={slide.elapsedTime}
                title={slide.title}
                onMoreOptions={onMoreOptions ? event => onMoreOptions(slide.followTarget ?? { kind: "publisher", name: slide.publisher }, event.currentTarget) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      <Pagination activeIndex={activeIndex} count={slides.length} onSelect={moveTo} />
    </div>
  );
}

/**
 * Bing App feed card from Figma nodes 3572:5631 (Light) and 3707:12385 (Dark).
 * Implements the five supplied variants, including horizontal navigation for Multi-cards.
 */
export function FeedCard({
  variant = "single",
  imageSrc,
  imageAlt,
  imagePosition,
  publisher,
  publisherLogoSrc,
  elapsedTime,
  title,
  slides,
  activeSlideIndex,
  onActiveSlideChange,
  followTarget,
  onMoreOptions,
  className,
  mediaAspectRatio,
}: FeedCardProps) {
  const isLoading = variant === "loading";
  const defaults = variant === "loading" ? DEFAULT_CONTENT.single : DEFAULT_CONTENT[variant];
  const resolvedPublisher = publisher ?? defaults.publisher;
  const resolvedElapsedTime = elapsedTime ?? defaults.elapsedTime;
  const resolvedTitle = title ?? defaults.title;
  const resolvedImage = imageSrc ?? defaults.imageSrc;
  const resolvedImageAlt = imageAlt ?? defaults.imageAlt;

  return (
    <article
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={mediaAspectRatio === undefined ? undefined : { "--gnrc-feed-card-media-aspect-ratio": mediaAspectRatio } as CSSProperties}
      aria-label={isLoading ? "Loading feed card" : resolvedTitle}
      aria-busy={isLoading || undefined}
    >
      {variant === "multi" ? (
        <MultiCardCarousel
          activeSlideIndex={activeSlideIndex}
          onActiveSlideChange={onActiveSlideChange}
          onMoreOptions={onMoreOptions}
          slides={
            slides?.length
              ? slides
              : [
                  {
                    imageSrc: resolvedImage,
                    imageAlt: resolvedImageAlt,
                    imagePosition,
                    publisher: resolvedPublisher,
                    publisherLogoSrc,
                    elapsedTime: resolvedElapsedTime,
                    title: resolvedTitle,
                    followTarget,
                  },
                  ...DEFAULT_MULTI_SLIDES.slice(1),
                ]
          }
        />
      ) : (
        <>
          <FeedMedia variant={variant} imageSrc={resolvedImage} imageAlt={resolvedImageAlt} imagePosition={imagePosition} />
          {isLoading ? (
            <SkeletonBody />
          ) : (
            <CardBody
              variant={variant}
              publisher={resolvedPublisher}
              publisherLogoSrc={publisherLogoSrc}
              elapsedTime={resolvedElapsedTime}
              title={resolvedTitle}
              onMoreOptions={onMoreOptions ? event => onMoreOptions(followTarget ?? { kind: "publisher", name: resolvedPublisher }, event.currentTarget) : undefined}
            />
          )}
        </>
      )}
    </article>
  );
}
