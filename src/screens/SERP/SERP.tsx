import { MoreHorizontal24Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useIsPresent } from "motion/react";
import { AppSearchBox, type AppSearchBoxProps } from "../../components/AppSearchBox";
import { IABFooter, type IABFooterProps } from "../../components/IABFooter";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import styles from "./SERP.module.css";

export interface SERPProps extends Omit<IABFooterProps, "className">,
  Pick<AppSearchBoxProps, "loadState" | "loadKey" | "animateLoading"> {
  query?: string;
  timeSource?: "fixed" | "system";
  onEditQuery?: () => void;
  active?: boolean;
  /** Search owns the visible field during its shared-composer transition. */
  searchConcealed?: boolean;
  /** Web-owned content. Omitting it renders the original Figma reference in Key screens. */
  webContent?: ReactNode;
}

/** The App owns only the chrome; Bing owns everything inside the central viewport. */
export function SERP({ query = "Weather", timeSource = "fixed", onEditQuery, active = true, searchConcealed = false, webContent, loadState, loadKey, animateLoading, ...navigation }: SERPProps) {
  const isPresent = useIsPresent();
  return <main className={styles.root} aria-label="Search results"
    aria-hidden={!active || !isPresent || undefined} {...(!active || !isPresent ? { inert: "" } : {})}>
    <header className={styles.header}>
      <IOSStatusBar timeSource={timeSource} />
      <div className={styles.searchRow}>
        <AppSearchBox variant="serp" className={`${styles.search} ${searchConcealed ? styles.searchConcealed : ""}`} state="input" value={query}
          loadState={loadState} loadKey={loadKey} animateLoading={animateLoading}
          inputProps={onEditQuery ? { "aria-label": "Edit search query", readOnly: true, inputMode: "none", onClick: onEditQuery,
            onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEditQuery(); } } } : undefined} />
        <span className={styles.more} role="img" aria-label="More"><MoreHorizontal24Regular /></span>
      </div>
    </header>
    <section className={styles.viewport} aria-label="Bing results" aria-busy={loadState === "loading" || loadState === "rendering"}
      data-serp-source={webContent ? "web" : "design-reference"}>
      {webContent ?? <img className={styles.reference} src={new URL("./assets/bing-weather-reference.png", import.meta.url).href}
        alt="Bing weather results — Figma design reference" draggable={false} />}
    </section>
    <div className={styles.footer}>
      <IABFooter {...navigation} />
      <IOSHomeIndicator />
    </div>
  </main>;
}
