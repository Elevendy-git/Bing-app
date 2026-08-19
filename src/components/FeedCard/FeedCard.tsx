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
} from "react";
import {
  FEED_CARD_AD_IMAGE,
  FEED_CARD_MULTI_IMAGE,
  FEED_CARD_SINGLE_IMAGE,
  FEED_CARD_WATCH_IMAGE,
} from "./FeedCard.assets";
import styles from "./FeedCard.module.css";

export type FeedCardVariant = "single" | "watch" | "multi" | "ad" | "loading";

export interface FeedCardProps {
  /** Visual form from the Figma Feed Cards component set. */
  variant?: FeedCardVariant;
  /** Article image. The matching bundled Figma example is used when omitted. */
  imageSrc?: string;
  /** Accessible description for the article image. */
  imageAlt?: string;
  /** Publisher displayed in the attribution row. */
  publisher?: string;
  /** Relative publish time. */
  elapsedTime?: string;
  /** Two-line article headline. */
  title?: string;
}

interface FeedCardContent {
  imageSrc: string;
  imageAlt: string;
  publisher: string;
  elapsedTime: string;
  title: string;
}

const DEFAULT_CONTENT: Record<Exclude<FeedCardVariant, "loading">, FeedCardContent> = {
  single: {
    imageSrc: FEED_CARD_SINGLE_IMAGE,
    imageAlt: "Two Adirondack chairs facing a quiet ocean",
    publisher: "Medium",
    elapsedTime: "31m",
    title: "Why UX Designers Are Shifting Away From Their Careers",
  },
  multi: {
    imageSrc: FEED_CARD_MULTI_IMAGE,
    imageAlt: "Colorful illustration of people walking in different directions",
    publisher: "Medium",
    elapsedTime: "31m",
    title: "How Emerging Technologies are Reshaping the Future of Work",
  },
  ad: {
    imageSrc: FEED_CARD_AD_IMAGE,
    imageAlt: "Colorful collectible characters standing on a surreal landscape",
    publisher: "Reddit",
    elapsedTime: "2h",
    title: "How Emerging Technologies are Reshaping the Future of Work",
  },
  watch: {
    imageSrc: FEED_CARD_WATCH_IMAGE,
    imageAlt: "Sunlight streaming through a rainforest beside a river",
    publisher: "Yahoo!",
    elapsedTime: "31m",
    title: "Designing for Forgiveness: How to Create Error-Tolerant Interfaces",
  },
};

const DEFAULT_MULTI_SLIDES: FeedCardContent[] = [
  DEFAULT_CONTENT.multi,
  {
    imageSrc: FEED_CARD_SINGLE_IMAGE,
    imageAlt: "Two Adirondack chairs facing a quiet ocean",
    publisher: "Medium",
    elapsedTime: "48m",
    title: "The Quiet Design Lessons Hidden in Everyday Travel",
  },
  {
    imageSrc: FEED_CARD_WATCH_IMAGE,
    imageAlt: "Sunlight streaming through a rainforest beside a river",
    publisher: "Medium",
    elapsedTime: "1h",
    title: "Designing for Forgiveness in a World Full of Interruptions",
  },
  {
    imageSrc: FEED_CARD_AD_IMAGE,
    imageAlt: "Colorful collectible characters standing on a surreal landscape",
    publisher: "Medium",
    elapsedTime: "2h",
    title: "How Digital Communities Are Shaping the Next Creative Era",
  },
  {
    imageSrc: FEED_CARD_MULTI_IMAGE,
    imageAlt: "Colorful illustration of people walking in different directions",
    publisher: "Medium",
    elapsedTime: "3h",
    title: "Five Signals That the Future of Work Is Already Here",
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
}: Pick<Required<FeedCardProps>, "variant" | "imageSrc" | "imageAlt">) {
  if (variant === "loading") {
    return <div className={`${styles.media} ${styles.mediaSkeleton}`} aria-hidden="true" />;
  }

  return (
    <div className={styles.media}>
      <img className={styles.image} src={imageSrc} alt={imageAlt} />
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
  elapsedTime,
  title,
}: Pick<Required<FeedCardProps>, "variant" | "publisher" | "elapsedTime" | "title">) {
  return (
    <div className={styles.body}>
      <div className={styles.metaRow}>
        <span className={styles.metaGroup}>
          {variant === "ad" ? (
            <span className={styles.adBadge}>Ad</span>
          ) : variant === "watch" ? (
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

function MultiCardCarousel({ firstSlide }: { firstSlide: FeedCardContent }) {
  const slides = [firstSlide, ...DEFAULT_MULTI_SLIDES.slice(1)];
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const moveTo = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, index)));
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
              key={`${slide.title}-${index}`}
            >
              <FeedMedia variant="multi" imageSrc={slide.imageSrc} imageAlt={slide.imageAlt} />
              <CardBody
                variant="multi"
                publisher={slide.publisher}
                elapsedTime={slide.elapsedTime}
                title={slide.title}
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
  publisher,
  elapsedTime,
  title,
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
      className={styles.root}
      aria-label={isLoading ? "Loading feed card" : resolvedTitle}
      aria-busy={isLoading || undefined}
    >
      {variant === "multi" ? (
        <MultiCardCarousel
          firstSlide={{
            imageSrc: resolvedImage,
            imageAlt: resolvedImageAlt,
            publisher: resolvedPublisher,
            elapsedTime: resolvedElapsedTime,
            title: resolvedTitle,
          }}
        />
      ) : (
        <>
          <FeedMedia variant={variant} imageSrc={resolvedImage} imageAlt={resolvedImageAlt} />
          {isLoading ? (
            <SkeletonBody />
          ) : (
            <CardBody
              variant={variant}
              publisher={resolvedPublisher}
              elapsedTime={resolvedElapsedTime}
              title={resolvedTitle}
            />
          )}
        </>
      )}
    </article>
  );
}
