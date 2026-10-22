// Adapted from One Copilot with the original geometry and spring motion; see README.md.
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import styles from "./IOSDynamicIsland.module.css";

export type IOSDynamicIslandPresentation = 'compact' | 'minimal' | 'expanded';

export interface IOSDynamicIslandExpandedRegions {
  leading?: ReactNode;
  trailing?: ReactNode;
  center?: ReactNode;
  bottom?: ReactNode;
}

interface IOSDynamicIslandBaseProps {
  ariaLabel: string;
}

export type IOSDynamicIslandProps = IOSDynamicIslandBaseProps &
  (
    | {
        presentation: 'compact';
        compactLeading: ReactNode;
        compactTrailing: ReactNode;
      }
    | {
        presentation: 'minimal';
        minimal: ReactNode;
      }
    | {
        presentation: 'expanded';
        expanded: IOSDynamicIslandExpandedRegions;
      }
  );

const REGULAR_PHONE_DYNAMIC_ISLAND = {
  compactRegionWidth: 52.33,
  compactContentHeight: 36.67,
  compactSurfaceHeight: 37.5,
  compactMaxWidth: 230,
  compactOuterPadding: 8,
  minimalMinWidth: 36.67,
  minimalMaxWidth: 45,
  expandedWidth: 371,
  expandedMinHeight: 84,
  expandedMaxHeight: 160,
  expandedCornerRadius: 44,
} as const;

const TRUE_DEPTH_RESERVATION =
  REGULAR_PHONE_DYNAMIC_ISLAND.compactMaxWidth -
  REGULAR_PHONE_DYNAMIC_ISLAND.compactRegionWidth * 2;

const COMPACT_MIN_WIDTH =
  TRUE_DEPTH_RESERVATION + REGULAR_PHONE_DYNAMIC_ISLAND.compactOuterPadding * 2;

const DYNAMIC_ISLAND_SPRING = {
  type: 'spring',
  stiffness: 340,
  damping: 32,
  mass: 0.9,
} as const;

const DYNAMIC_ISLAND_CONTENT_ENTER = {
  delay: 0.09,
  duration: 0.15,
  ease: [0.2, 0, 0, 1],
} as const;

const DYNAMIC_ISLAND_CONTENT_EXIT = {
  duration: 0.08,
  ease: [0.4, 0, 1, 1],
} as const;

const compactContentStyle: CSSProperties = {
  gridTemplateColumns: `fit-content(${REGULAR_PHONE_DYNAMIC_ISLAND.compactRegionWidth}px) ${TRUE_DEPTH_RESERVATION}px fit-content(${REGULAR_PHONE_DYNAMIC_ISLAND.compactRegionWidth}px)`,
  height: REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight,
  maxWidth: REGULAR_PHONE_DYNAMIC_ISLAND.compactMaxWidth,
  paddingInline: REGULAR_PHONE_DYNAMIC_ISLAND.compactOuterPadding,
};

const minimalSurfaceGeometry = {
  height: REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight,
  minHeight: REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight,
  maxHeight: REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight,
  width: 'auto',
  minWidth: REGULAR_PHONE_DYNAMIC_ISLAND.minimalMinWidth,
  maxWidth: REGULAR_PHONE_DYNAMIC_ISLAND.minimalMaxWidth,
  borderRadius: REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight / 2,
} as const;

const expandedSurfaceGeometry = {
  minHeight: REGULAR_PHONE_DYNAMIC_ISLAND.expandedMinHeight,
  maxHeight: REGULAR_PHONE_DYNAMIC_ISLAND.expandedMaxHeight,
  width: REGULAR_PHONE_DYNAMIC_ISLAND.expandedWidth,
  minWidth: REGULAR_PHONE_DYNAMIC_ISLAND.expandedWidth,
  maxWidth: REGULAR_PHONE_DYNAMIC_ISLAND.expandedWidth,
  borderRadius: REGULAR_PHONE_DYNAMIC_ISLAND.expandedCornerRadius,
} as const;

const expandedContentStyle: CSSProperties = {
  gridTemplateColumns: `minmax(0, 1fr) ${TRUE_DEPTH_RESERVATION}px minmax(0, 1fr)`,
  gridTemplateRows: `${REGULAR_PHONE_DYNAMIC_ISLAND.compactContentHeight}px auto minmax(0, 1fr)`,
};

export function IOSDynamicIsland(props: IOSDynamicIslandProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const compactContentRef = useRef<HTMLDivElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const [compactWidth, setCompactWidth] = useState<number>(
    REGULAR_PHONE_DYNAMIC_ISLAND.compactMaxWidth,
  );
  const [expandedHeight, setExpandedHeight] = useState<number>(
    REGULAR_PHONE_DYNAMIC_ISLAND.expandedMinHeight,
  );

  useLayoutEffect(() => {
    if (props.presentation !== 'compact') return undefined;

    const compactContent = compactContentRef.current;
    if (!compactContent) return undefined;

    const measureCompactWidth = () => {
      const nextWidth = Math.min(
        REGULAR_PHONE_DYNAMIC_ISLAND.compactMaxWidth,
        Math.max(COMPACT_MIN_WIDTH, compactContent.scrollWidth),
      );
      setCompactWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    measureCompactWidth();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const resizeObserver = new ResizeObserver(measureCompactWidth);
    resizeObserver.observe(compactContent);
    return () => resizeObserver.disconnect();
  }, [props.presentation]);

  useLayoutEffect(() => {
    if (props.presentation !== 'expanded') return undefined;

    const expandedContent = expandedContentRef.current;
    if (!expandedContent) return undefined;

    const measureExpandedHeight = () => {
      const nextHeight = Math.min(
        REGULAR_PHONE_DYNAMIC_ISLAND.expandedMaxHeight,
        Math.max(
          REGULAR_PHONE_DYNAMIC_ISLAND.expandedMinHeight,
          expandedContent.scrollHeight,
        ),
      );
      setExpandedHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };

    measureExpandedHeight();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const resizeObserver = new ResizeObserver(measureExpandedHeight);
    resizeObserver.observe(expandedContent);
    return () => resizeObserver.disconnect();
  }, [props.presentation]);

  const surfaceGeometry =
    props.presentation === 'expanded'
      ? { ...expandedSurfaceGeometry, height: expandedHeight }
      : props.presentation === 'minimal'
        ? minimalSurfaceGeometry
        : {
            height: REGULAR_PHONE_DYNAMIC_ISLAND.compactSurfaceHeight,
            minHeight: REGULAR_PHONE_DYNAMIC_ISLAND.compactSurfaceHeight,
            maxHeight: REGULAR_PHONE_DYNAMIC_ISLAND.compactSurfaceHeight,
            width: compactWidth,
            minWidth: COMPACT_MIN_WIDTH,
            maxWidth: REGULAR_PHONE_DYNAMIC_ISLAND.compactMaxWidth,
            borderRadius: REGULAR_PHONE_DYNAMIC_ISLAND.compactSurfaceHeight / 2,
          };
  const surfaceTransition = reduceMotion
    ? { duration: 0 }
    : DYNAMIC_ISLAND_SPRING;
  const contentMotion = reduceMotion
    ? {
        initial: false as const,
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: DYNAMIC_ISLAND_CONTENT_ENTER },
        exit: { opacity: 0, transition: DYNAMIC_ISLAND_CONTENT_EXIT },
      };

  return (
    <motion.div
      aria-label={props.ariaLabel}
      data-presentation={props.presentation}
      data-testid="ios-dynamic-island"
      role="group"
      initial={false}
      animate={surfaceGeometry}
      transition={surfaceTransition}
      style={{ transformOrigin: '50% 0%' }}
      className={styles.surface}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {props.presentation === 'minimal' ? (
          <motion.div
            key="minimal"
            {...contentMotion}
            className={styles.minimalContent}
          >
            <div
              data-testid="dynamic-island-minimal"
              className={styles.clippedRegion}
            >
              {props.minimal}
            </div>
          </motion.div>
        ) : props.presentation === 'expanded' ? (
          <motion.div
            key="expanded"
            {...contentMotion}
            className={styles.expandedContent}
          >
            <div
              ref={expandedContentRef}
              style={expandedContentStyle}
              className={styles.expandedGrid}
            >
              <div
                data-testid="dynamic-island-expanded-leading"
                className={styles.expandedSide}
                style={{ gridColumn: 1, gridRow: '1 / 3' }}
              >
                {props.expanded.leading}
              </div>
              <div aria-hidden style={{ gridColumn: 2, gridRow: 1 }} />
              <div
                data-testid="dynamic-island-expanded-trailing"
                className={styles.expandedSide}
                style={{ gridColumn: 3, gridRow: '1 / 3' }}
              >
                {props.expanded.trailing}
              </div>
              <div
                data-testid="dynamic-island-expanded-center"
                className={styles.clippedRegion}
                style={{ gridColumn: 2, gridRow: 2 }}
              >
                {props.expanded.center}
              </div>
              <div
                data-testid="dynamic-island-expanded-bottom"
                className={styles.expandedBottom}
                style={{ gridColumn: '1 / 4', gridRow: 3 }}
              >
                {props.expanded.bottom}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="compact"
            {...contentMotion}
            className={styles.compactContent}
          >
            <div
              ref={compactContentRef}
              style={compactContentStyle}
              className={styles.compactGrid}
            >
              <div
                data-testid="dynamic-island-compact-leading"
                className={styles.compactLeading}
              >
                {props.compactLeading}
              </div>
              <div aria-hidden />
              <div
                data-testid="dynamic-island-compact-trailing"
                className={styles.compactTrailing}
              >
                {props.compactTrailing}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
