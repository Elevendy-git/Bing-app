import { ChevronRight20Regular } from "@fluentui/react-icons";
import type { CSSProperties } from "react";
import { IABFooter, AppList, AppListCard, AppSearchBox, IOSHomeIndicator, IOSStatusBar, TabsCard, type AppFooterProps } from "../../components";
import { ScreenFooter } from "../ScreenFooter";
import { NewTabButton } from "../NewTabButton";
import { RECENT_BOOKMARKS, RECENT_CONVERSATIONS, RECENT_SITES, RECENT_TABS, type RecentEntry, type RecentTab } from "./Recent.data";
import { HistoryListRow } from "../History/HistoryListRow";
import styles from "./Recent.module.css";

const emptyIllustration = new URL("./assets/empty-recent.png", import.meta.url).href;

const sectionSpacing = (first: boolean): CSSProperties => ({
  "--gnrc-list-section-padding-top": first ? "12px" : "32px",
  "--gnrc-list-section-padding-bottom": "16px",
} as CSSProperties);

export interface RecentProps {
  timeSource?: "fixed" | "system";
  footerVariant?: "app" | "browser";
  onBackToResults?: () => void;
  onNewTab?: () => void;
  tabs?: readonly RecentTab[];
  selectedTabId?: string | null;
  onViewTabs?: () => void;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  historyEntries?: readonly RecentEntry[];
  onViewHistory?: () => void;
  conversationEntries?: readonly RecentEntry[];
  bookmarkEntries?: readonly RecentEntry[];
  onViewBookmarks?: () => void;
  onNavigate?: AppFooterProps["onSelectedTabChange"];
}

/** Recent fills the mobile canvas with shared search and content insets. */
export function Recent({ timeSource = "fixed", footerVariant = "app", onBackToResults, onNewTab, onNavigate,
  tabs = RECENT_TABS, selectedTabId = "spring", onViewTabs, onSelectTab, onCloseTab,
  historyEntries = RECENT_SITES, onViewHistory, conversationEntries = RECENT_CONVERSATIONS,
  bookmarkEntries = RECENT_BOOKMARKS, onViewBookmarks }: RecentProps) {
  const isEmpty = [tabs, historyEntries, conversationEntries, bookmarkEntries].every(entries => entries.length === 0);
  const listSections = [
    { title: "History", variant: "bing-search-history", entries: historyEntries.slice(0, 3), onView: onViewHistory },
    { title: "Copilot history", variant: "copilot-history", entries: conversationEntries, onView: undefined },
    { title: "Bookmark", variant: "bing-search-history", entries: bookmarkEntries, onView: onViewBookmarks },
  ] as const;
  return (
    <main className={styles.root} aria-label="Recent page">
      <header className={styles.header}>
        <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
        <div className={styles.searchRegion}>
          <AppSearchBox variant="recent" className={styles.search} />
        </div>
      </header>
      <div className={[styles.scrollContent, isEmpty && styles.emptyContent].filter(Boolean).join(" ")}
        role="region" aria-label="Recent content" tabIndex={0}>
        {isEmpty ? <div className={styles.empty}>
          <img src={emptyIllustration} width={128} height={128} alt="" draggable={false} />
          <div className={styles.emptyText}>
            <h3>Your activity will appear here</h3>
            <p>Start searching to build your activity</p>
          </div>
        </div> : <>
        <section aria-label="Open tabs">
          <AppList variant="section-header" title="Open tabs" className={styles.sectionHeader}
            style={sectionSpacing(true)} onClick={onViewTabs} ariaLabel="View all open tabs" />
          <div className={styles.tabStrip} role="group" aria-label="Open tabs cards" tabIndex={0}>
            {tabs.map((tab) => (
              <TabsCard key={tab.id} title={tab.title} previewSrc={tab.previewSrc} faviconSrc={tab.faviconSrc}
                previewStyle={tab.previewStyle} className={styles.tab} selected={selectedTabId === tab.id}
                {...(!onSelectTab && !onCloseTab ? { inert: "" } : {})}
                onSelect={onSelectTab ? () => onSelectTab(tab.id) : undefined}
                onClose={onCloseTab ? () => onCloseTab(tab.id) : undefined}
                selectLabel={`Select ${tab.title} tab: ${tab.id}`} closeLabel={`Close ${tab.title} tab: ${tab.id}`} />
            ))}
            {onViewTabs ? <button type="button" className={styles.viewAllTabs} onClick={onViewTabs} aria-label="View all tabs">
              <span><ChevronRight20Regular aria-hidden="true" /></span>View all
            </button> : <div className={styles.viewAllTabs}><span><ChevronRight20Regular aria-hidden="true" /></span>View all</div>}
          </div>
        </section>
        {listSections.map(({ title, variant, entries, onView }) => (
          <section key={title} aria-label={title}>
            <AppList variant="section-header" title={title} className={styles.sectionHeader}
              style={sectionSpacing(false)} onClick={onView} ariaLabel={`View all ${title.toLowerCase()}`} />
            {entries.length > 0 && <div className={styles.cardInset}>
              <AppListCard className={styles.listCard} ariaLabel={`${title} list`}>
                {entries.map((entry, index) => (
                  variant === "bing-search-history"
                    ? <HistoryListRow key={entry.id} entry={entry} showDivider={index < entries.length - 1} />
                    : <AppList key={entry.id} variant={variant} title={entry.title} subtitle={entry.subtitle}
                        logoSrc={entry.logoSrc} showDivider={index < entries.length - 1} />
                ))}
              </AppListCard>
            </div>}
          </section>
        ))}
        </>}
      </div>
      <NewTabButton onClick={onNewTab} />
      {footerVariant === "browser" ? <div className={styles.browserFooter}>
        <IABFooter recentSelected backLabel="Back to search results" navigationLabel="Recent browser navigation"
          onBack={onBackToResults} onHome={onNavigate ? () => onNavigate("home") : undefined}
          onRecent={onNavigate ? () => onNavigate("collections") : undefined} />
        <IOSHomeIndicator />
      </div>
        : <ScreenFooter selectedTab="collections" labels={{ collections: "Recent" }} onSelectedTabChange={onNavigate} />}
    </main>
  );
}
