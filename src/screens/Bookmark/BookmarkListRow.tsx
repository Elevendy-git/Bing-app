import { ChevronRight20Regular, Folder24Regular, Globe24Regular } from "@fluentui/react-icons";
import { AppList, type AppListProps } from "../../components";
import type { BookmarkEntry } from "./Bookmark.data";
import styles from "./Bookmark.module.css";

export function BookmarkListRow({ entry, ...props }: { entry: BookmarkEntry } & Omit<AppListProps, "title" | "subtitle" | "variant">) {
  const folder = entry.kind === "folder";
  const logo = folder ? <Folder24Regular aria-hidden="true" /> : entry.genericIcon ? <Globe24Regular aria-hidden="true" />
    : entry.nativeLogo ? <span className={styles.nativeLogo}><img src={entry.logoSrc} alt="" /></span> : undefined;
  return <AppList {...props} variant="bing-search-history" title={entry.title}
    subtitle={folder ? `${entry.favoriteCount} favorites` : entry.subtitle}
    logo={logo} logoSrc={folder ? undefined : entry.logoSrc}
    rightControl={folder ? <ChevronRight20Regular aria-hidden="true" /> : undefined} />;
}
