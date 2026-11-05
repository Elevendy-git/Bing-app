import { memo, useLayoutEffect, useRef, useState } from "react";
import type { BingPageSnapshot } from "../../services/bingPage";
import styles from "./TabsCard.module.css";

/** Reuse the loaded document at its mobile viewport size, without another search request. */
export const TabPagePreview = memo(function TabPagePreview({ snapshot, title }: { snapshot: BingPageSnapshot; title: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(140);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => { if (element.clientWidth > 0) setWidth(element.clientWidth); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className={styles.documentPreview} aria-hidden="true" {...{ inert: "" }}>
    <iframe title={`Page preview: ${title}`} srcDoc={snapshot.html} tabIndex={-1} loading="lazy"
      sandbox="" referrerPolicy="no-referrer" {...{ credentialless: "" }}
      data-preview-source="loaded-page" data-fetched-at={snapshot.fetchedAt}
      style={{ width: snapshot.viewportWidth, height: snapshot.viewportHeight, transform: `scale(${width / snapshot.viewportWidth})` }} />
  </div>;
});
