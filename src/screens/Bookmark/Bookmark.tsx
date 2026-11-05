import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, AppListCard, BookmarkMenu, IOSHomeIndicator, IOSStatusBar } from "../../components";
import { AnchoredMenu, useAnchoredMenu } from "../../components/MenuList/AnchoredMenu";
import { iosMotion } from "../../motion/iosMotion";
import { CollapsingContent } from "../../motion/MotionPresence";
import { ActivityEmptyState } from "../ActivityEmptyState";
import { BOOKMARK_ENTRIES, type BookmarkEntry, type BookmarkFolder } from "./Bookmark.data";
import { BookmarkListRow } from "./BookmarkListRow";
import styles from "./Bookmark.module.css";

export interface BookmarkProps {
  entries?: readonly BookmarkEntry[];
  timeSource?: "fixed" | "system";
  interactive?: boolean;
  active?: boolean;
  initialMenu?: "page" | "item";
  initialFolderId?: string;
  onBack?: () => void;
  backLabel?: string;
  onDelete?: (id: string) => void;
}

interface BookmarkPageProps extends BookmarkProps {
  title?: string;
  onOpenFolder?: (folder: BookmarkFolder) => void;
}

function BookmarkPage({ entries = BOOKMARK_ENTRIES, title = "Bookmark", backLabel = "Back to Recent",
  timeSource = "fixed", interactive = false, active = true, initialMenu, onBack, onDelete, onOpenFolder }: BookmarkPageProps) {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const inactive = !active || !present;
  const overlay = useAnchoredMenu({ root, fallback: content, active: !inactive,
    initialState: initialMenu === "page" ? { kind: "page" }
      : initialMenu === "item" ? { kind: "item", entryId: "spotify", top: 375, right: 32 } : null,
  });
  const { state: menu, id: menuId } = overlay;
  useEffect(() => {
    if (interactive && active) Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.getAttribute("aria-label") === backLabel)?.focus({ preventScroll: true });
  }, [interactive, active, backLabel]);
  return <main ref={root} className={styles.root} aria-label={title === "Bookmark" ? "Bookmark page" : `${title} folder`}
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header} {...(overlay.presented ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title={title} className={styles.appHeader}
        leftAction={{ label: backLabel, icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "Bookmark options", icon: <MoreHorizontal24Regular />,
          "aria-haspopup": "menu", "aria-expanded": menu?.kind === "page", "aria-controls": menu?.kind === "page" ? menuId : undefined,
          onClick: interactive ? event => overlay.openPage(event.currentTarget) : undefined }]} />
    </div>
    <div ref={content} className={styles.scrollContent} role="region" aria-label={`${title} content`} tabIndex={0}
      {...(overlay.presented ? { inert: "" } : {})}>
      <AnimatePresence initial={false}>
      {entries.length === 0 && <ActivityEmptyState key="empty" kind="bookmark" animated={interactive} />}
      {entries.length > 0 && <CollapsingContent key="list" enabled={interactive}><AppListCard className={styles.listCard} ariaLabel={`${title} bookmarks`}>
        <AnimatePresence initial={false}>
        {entries.map((entry, index) => <CollapsingContent key={entry.id} className={styles.row} enabled={interactive}>
          <BookmarkListRow entry={entry}
          showDivider={index < entries.length - 1}
          ariaLabel={entry.kind === "folder" ? `Open ${entry.title} folder` : undefined}
          onClick={interactive && entry.kind === "folder" && entry.children && onOpenFolder ? () => onOpenFolder(entry) : undefined}
          rightControlLabel={`Options for ${entry.title}, ${entry.id}`}
          rightControlExpanded={entry.kind === "site" ? menu?.kind === "item" && menu.entryId === entry.id : undefined}
          rightControlMenuId={menu?.kind === "item" && menu.entryId === entry.id ? menuId : undefined}
          onRightControlClick={interactive && entry.kind === "site" ? event => overlay.openItem(entry.id, event.currentTarget, { height: 96, overlap: 6 }) : undefined} />
        </CollapsingContent>)}
        </AnimatePresence>
      </AppListCard></CollapsingContent>}
      </AnimatePresence>
    </div>
    <IOSHomeIndicator placement="overlay" />
    <AnchoredMenu menu={overlay} interactive={interactive}>
      {menu && <BookmarkMenu variant={menu.kind} id={menuId} autoFocus={interactive} onDismiss={interactive ? () => overlay.close() : undefined}
        onDelete={interactive && onDelete && menu.kind === "item" ? () => {
          onDelete(menu.entryId); overlay.close(true);
        } : undefined} />}
    </AnchoredMenu>
  </main>;
}

/** Keep the full list mounted so returning from a folder restores its scroll. */
export function Bookmark({ entries = BOOKMARK_ENTRIES, initialFolderId, active = true, ...props }: BookmarkProps) {
  const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();
  const folder = entries.find((entry): entry is BookmarkFolder => entry.kind === "folder" && entry.id === folderId);
  return <div ref={root} className={styles.stack}>
    <BookmarkPage {...props} entries={entries} active={active && present && !folder}
      onOpenFolder={entry => { opener.current = entry.title; setFolderId(entry.id); }} />
    <AnimatePresence onExitComplete={() => {
      if (!folderId && opener.current) Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .find(button => button.getAttribute("aria-label") === `Open ${opener.current} folder`)?.focus({ preventScroll: true });
    }}>
      {folder?.children && <motion.div className={styles.folderScreen} key={folder.id}
        initial={initialFolderId ? false : { x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
        transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
        <BookmarkPage {...props} initialMenu={undefined} title={folder.title} entries={folder.children}
          active={active && present} backLabel="Back to Bookmark" onBack={props.interactive ? () => setFolderId(null) : undefined} />
      </motion.div>}
    </AnimatePresence>
  </div>;
}
