import { AppList, type AppListProps } from "../../components/AppList";
import type { RecentEntry } from "../Recent/Recent.data";
import styles from "./History.module.css";

/** Shared by the Recent summary and the date-grouped History screen. */
export function HistoryListRow({ entry, ...props }: { entry: RecentEntry } & Omit<AppListProps, "title" | "subtitle" | "variant">) {
  return <AppList {...props} variant="bing-search-history" title={entry.title} subtitle={entry.subtitle}
    logoSrc={entry.logoSrc} logo={entry.nativeLogo ? <span className={styles.nativeLogo}><img src={entry.logoSrc} alt="" /></span> : undefined} />;
}
