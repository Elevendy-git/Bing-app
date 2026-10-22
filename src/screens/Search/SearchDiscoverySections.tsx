import { useId, useLayoutEffect, useRef, useState } from "react";
import { Eye16Regular, EyeOff16Regular } from "@fluentui/react-icons";
import { motion, useReducedMotion } from "motion/react";
import { AppList, AppListCard } from "../../components/AppList";
import { iosMotion } from "../../motion/iosMotion";
import type { DiscoveryItem, DiscoverySection } from "../../services/searchDiscovery";
import { RECOMMENDATIONS, TRENDING_SEARCHES } from "./Search.data";
import type { DiscoveryResource, SearchDiscovery } from "./useSearchDiscovery";
import styles from "./Search.module.css";
import liveStyles from "./SearchDiscoverySections.module.css";

export type DiscoveryVisibility = Readonly<Record<DiscoverySection, boolean>>;
export const DEFAULT_DISCOVERY_VISIBILITY: DiscoveryVisibility = { recommendations: true, trending: true };

export interface SearchDiscoverySectionsProps {
  discovery?: SearchDiscovery;
  visibility?: DiscoveryVisibility;
  onToggleSection?: (section: DiscoverySection) => void;
}

function DiscoveryImage({ src, kind }: { src: string; kind: DiscoverySection }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className={kind === "trending" ? liveStyles.trendingImage : liveStyles.recommendationImage}
    src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function DiscoveryList({ kind, resource, visible, onToggle }: {
  kind: DiscoverySection; resource?: DiscoveryResource; visible: boolean; onToggle?: () => void;
}) {
  const contentId = useId();
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>();
  const interactive = Boolean(onToggle);
  const animate = interactive && !reducedMotion;
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!interactive || !content) return;
    // Measure the full, unscaled content even while its viewport is collapsed.
    // Numeric targets avoid remeasuring/restoring `auto` during a rapid reversal.
    const measure = () => setContentHeight(content.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [interactive]);
  const title = kind === "recommendations" ? "You might like" : "What’s trending";
  const preview = kind === "recommendations" ? RECOMMENDATIONS : TRENDING_SEARCHES;
  const items: readonly DiscoveryItem[] = resource ? resource.page?.items ?? []
    : preview.map((item, index) => ({ id: String(index), title: item.title, imageSrc: item.image, url: "" }));
  const loading = resource?.status === "loading" && !items.length;
  const eye = <span className={liveStyles.visibilitySymbols} aria-hidden="true">
    <motion.span initial={false} animate={{ opacity: visible ? 1 : 0 }} transition={animate ? iosMotion.disclosureSymbol : iosMotion.instant}><Eye16Regular /></motion.span>
    <motion.span initial={false} animate={{ opacity: visible ? 0 : 1 }} transition={animate ? iosMotion.disclosureSymbol : iosMotion.instant}><EyeOff16Regular /></motion.span>
  </span>;
  return <>
    <AppList variant="section-header" title={title} className={styles.sectionHeader}
      rightControl={onToggle ? <button type="button" className={liveStyles.visibilityAction}
        aria-label={`${visible ? "Hide" : "Show"} ${title}`} aria-expanded={visible} aria-controls={contentId}
        onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()}
        onClick={onToggle}>{eye}</button> : eye} />
    <motion.div id={contentId} className={liveStyles.sectionBody} initial={false}
      animate={{ height: visible ? contentHeight ?? "auto" : 0 }}
      transition={animate ? iosMotion.disclosure : iosMotion.instant}
      aria-hidden={!visible || undefined} {...(!visible ? { inert: "" } : {})}>
      <motion.div ref={contentRef} className={styles.cardInset} initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={animate ? visible ? iosMotion.disclosureReveal : iosMotion.disclosureHide : iosMotion.instant}
        data-discovery-section={kind} data-source={resource?.page?.source ?? (resource ? undefined : "preview")}
        data-fetched-at={resource?.page?.fetchedAt} aria-busy={loading}>
        <AppListCard ariaLabel={title} className={styles.listCard}>
          {items.map((item, index) => <AppList key={item.id} variant={kind === "recommendations" ? "yml" : "trending"}
            title={kind === "trending" ? item.headline ?? item.title : item.title} rank={index + 1} showDivider={index < items.length - 1}
            showLogo={Boolean(item.imageSrc)} logo={item.imageSrc ? <DiscoveryImage key={item.imageSrc} src={item.imageSrc} kind="recommendations" /> : null}
            showRightControl={kind === "trending" && Boolean(item.imageSrc)}
            rightControl={item.imageSrc ? resource
              ? <DiscoveryImage key={item.imageSrc} src={item.imageSrc} kind="trending" />
              : <img className={styles.trendingImage} src={item.imageSrc} alt="" /> : null} />)}
          {loading && <div role="status" aria-label={`Loading ${title}`}>
            {Array.from({ length: kind === "recommendations" ? 3 : 6 }, (_, index) => <div key={index}
              className={`${liveStyles.skeletonRow} ${kind === "trending" ? liveStyles.trendingRow : ""}`} aria-hidden="true">
              <span className={liveStyles.skeletonImage} /><span className={liveStyles.skeletonText} />
            </div>)}
          </div>}
          {resource && !loading && !items.length && <div className={liveStyles.message} role="status">
            <p>{kind === "recommendations" ? "Recommendations couldn’t load." : "Trending searches aren’t available right now."}</p>
            <button type="button" onClick={resource.retry}>Try again</button>
          </div>}
        </AppListCard>
      </motion.div>
    </motion.div>
  </>;
}

export function SearchDiscoverySections({ discovery, visibility = DEFAULT_DISCOVERY_VISIBILITY, onToggleSection }: SearchDiscoverySectionsProps) {
  return <><DiscoveryList kind="recommendations" resource={discovery?.recommendations} visible={visibility.recommendations}
    onToggle={onToggleSection ? () => onToggleSection("recommendations") : undefined} />
    <DiscoveryList kind="trending" resource={discovery?.trending} visible={visibility.trending}
      onToggle={onToggleSection ? () => onToggleSection("trending") : undefined} /></>;
}
