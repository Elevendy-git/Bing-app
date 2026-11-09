import { AppList, type AppListProps } from "../../components/AppList";
import { Globe24Regular } from "@fluentui/react-icons";
import { useState } from "react";
import type { RecentEntry } from "../activity/types";
import { bingSearchQuery } from "../../services/bingPage";
import { webUrl } from "../../services/webNavigation";
import styles from "./History.module.css";

/** Shared by the Recent summary and the date-grouped History screen. */
export function HistoryListRow({ entry, onOpenSearch, onOpenPage, ...props }: {
  entry: RecentEntry;
  onOpenSearch?: (query: string) => void;
  onOpenPage?: (url: string) => void;
} & Omit<AppListProps, "title" | "subtitle" | "variant">) {
  const query = onOpenSearch ? bingSearchQuery(entry.subtitle) : null;
  const url = onOpenPage ? webUrl(entry.subtitle) : null;
  const [failedLogo, setFailedLogo] = useState<string>();
  const logo = entry.logoSrc && failedLogo !== entry.logoSrc
    ? <span className={entry.nativeLogo ? styles.nativeLogo : styles.siteLogo}>
        <img src={entry.logoSrc} alt="" referrerPolicy="no-referrer" onError={() => setFailedLogo(entry.logoSrc)} />
      </span>
    : <Globe24Regular aria-hidden="true" />;
  return <AppList {...props} variant="bing-search-history" title={entry.title} subtitle={entry.subtitle}
    onClick={query && onOpenSearch ? () => onOpenSearch(query) : url && onOpenPage ? () => onOpenPage(url) : props.onClick}
    logo={logo} />;
}
