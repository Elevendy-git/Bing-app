import { MoreHorizontal24Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useIsPresent } from "motion/react";
import { AppSearchBox, type AppSearchBoxProps } from "../../components/AppSearchBox";
import { IABFooter, type IABFooterProps } from "../../components/IABFooter";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOSStatusBar } from "../../components/IOSStatusBar";
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
}

/** The App owns only the chrome; Bing owns everything inside the central viewport. */
export function SERP({ query = "Weather", timeSource = "fixed", onEditQuery, onVoiceSearch, active = true, searchConcealed = false, webContent, webPage = false, privateMode = false, loadState, loadKey, animateLoading, ...navigation }: SERPProps) {
  const isPresent = useIsPresent();
  return <main className={styles.root} aria-label={webPage ? "In-app browser" : "Search results"} data-private-mode={privateMode}
    aria-hidden={!active || !isPresent || undefined} {...(!active || !isPresent ? { inert: "" } : {})}>
    <header className={styles.header} data-product={privateMode ? "consumer" : undefined} data-theme={privateMode ? "dark" : undefined} data-private-mode={privateMode}>
      <IOSStatusBar timeSource={timeSource} tone={privateMode ? "light" : "inherit"} />
      <div className={styles.searchRow}>
        <AppSearchBox variant="serp" className={`${styles.search} ${searchConcealed ? styles.searchConcealed : ""}`} state="input" value={query}
          loadState={loadState} loadKey={loadKey} animateLoading={animateLoading}
          onVoiceSearch={active && isPresent ? onVoiceSearch : undefined}
          inputProps={onEditQuery ? { "aria-label": "Edit search query", readOnly: true, inputMode: "none", onClick: onEditQuery,
            onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEditQuery(); } } } : undefined} />
        <span className={styles.more} role="img" aria-label="More"><MoreHorizontal24Regular /></span>
      </div>
    </header>
    <section className={styles.viewport} aria-label={webPage ? "Web page" : "Bing results"} aria-busy={loadState === "loading" || loadState === "rendering"}
      data-serp-source={webContent ? "web" : "design-reference"}>
      {webContent ?? <img className={styles.reference} src={new URL("./assets/bing-weather-reference.png", import.meta.url).href}
        alt="Bing weather results — Figma design reference" draggable={false} />}
    </section>
    <div className={styles.footer}>
      <IABFooter {...navigation} navigationLabel={navigation.navigationLabel ?? (webPage ? "In-app browser navigation" : undefined)} />
      <IOSHomeIndicator />
    </div>
  </main>;
}
