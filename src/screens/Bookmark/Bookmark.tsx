import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, AppListCard, BookmarkMenu, IOSStatusBar, type AppFooterProps } from "../../components";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { ScreenFooter } from "../ScreenFooter";
import { iosMotion } from "../../motion/iosMotion";
import { BOOKMARK_ENTRIES, type BookmarkEntry, type BookmarkFolder } from "./Bookmark.data";
import { BookmarkListRow } from "./BookmarkListRow";
import styles from "./Bookmark.module.css";

type MenuState = { kind: "page" } | { kind: "item"; entryId: string; top: number; right: number };
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
  onNavigate?: AppFooterProps["onSelectedTabChange"];
}

interface BookmarkPageProps extends BookmarkProps {
  title?: string;
  onOpenFolder?: (folder: BookmarkFolder) => void;
}

function BookmarkPage({ entries = BOOKMARK_ENTRIES, title = "Bookmark", backLabel = "Back to Recent",
  timeSource = "fixed", interactive = false, active = true, initialMenu, onBack, onDelete, onNavigate, onOpenFolder }: BookmarkPageProps) {
  const [menu, setMenu] = useState<MenuState | null>(initialMenu === "page" ? { kind: "page" }
    : initialMenu === "item" ? { kind: "item", entryId: "spotify", top: 375, right: 32 } : null);
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();
  const inactive = !active || !present;
  useEffect(() => {
    if (interactive && active) Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.getAttribute("aria-label") === backLabel)?.focus({ preventScroll: true });
  }, [interactive, active, backLabel]);
  const dismiss = () => {
    setMenu(null);
    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected && !trigger.current.closest("[inert]") ? trigger.current : content.current;
      target?.focus({ preventScroll: true });
    });
  };
  const openItemMenu = (entryId: string, button: HTMLButtonElement) => {
    const screen = root.current;
    if (!screen) return;
    const bounds = screen.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const scale = screen.offsetWidth && bounds.width ? bounds.width / screen.offsetWidth : 1;
    const bottomLimit = screen.clientHeight - IOS_METRICS.bottomSafeArea - 52 - 8;
    let top = (target.bottom - bounds.top) / scale - 6;
    if (top + 96 > bottomLimit) top = (target.top - bounds.top) / scale - 96 + 6;
    trigger.current = button;
    setMenu({ kind: "item", entryId, top: Math.max(IOS_METRICS.statusBarHeight + 56, top),
      right: (bounds.right - target.right) / scale + 6 });
  };
  return <main ref={root} className={styles.root} aria-label={title === "Bookmark" ? "Bookmark page" : `${title} folder`}
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header} {...(menu ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title={title} className={styles.appHeader}
        leftAction={{ label: backLabel, icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "Bookmark options", icon: <MoreHorizontal24Regular />,
          "aria-haspopup": "menu", "aria-expanded": menu?.kind === "page", "aria-controls": menu?.kind === "page" ? menuId : undefined,
          onClick: interactive ? event => { trigger.current = event.currentTarget; setMenu({ kind: "page" }); } : undefined }]} />
    </div>
    <div ref={content} className={styles.scrollContent} role="region" aria-label={`${title} content`} tabIndex={0}
      {...(menu ? { inert: "" } : {})}>
      {entries.length > 0 && <AppListCard className={styles.listCard} ariaLabel={`${title} bookmarks`}>
        <AnimatePresence initial={false}>
        {entries.map((entry, index) => <motion.div key={entry.id} className={styles.row} layout="position"
          initial={false} exit={{ opacity: 0, height: 0 }} transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
          <BookmarkListRow entry={entry}
          showDivider={index < entries.length - 1}
          ariaLabel={entry.kind === "folder" ? `Open ${entry.title} folder` : undefined}
          onClick={interactive && entry.kind === "folder" && entry.children && onOpenFolder ? () => onOpenFolder(entry) : undefined}
          rightControlLabel={`Options for ${entry.title}, ${entry.id}`}
          rightControlExpanded={entry.kind === "site" ? menu?.kind === "item" && menu.entryId === entry.id : undefined}
          rightControlMenuId={menu?.kind === "item" && menu.entryId === entry.id ? menuId : undefined}
          onRightControlClick={interactive && entry.kind === "site" ? event => openItemMenu(entry.id, event.currentTarget) : undefined} />
        </motion.div>)}
        </AnimatePresence>
      </AppListCard>}
    </div>
    <div {...(menu ? { inert: "" } : {})}>
      <ScreenFooter selectedTab="collections" labels={{ collections: "Recent" }} onSelectedTabChange={onNavigate} />
    </div>
    <AnimatePresence>
      {menu && <motion.div className={styles.menuLayer} initial={initialMenu ? false : { opacity: 0 }}
        animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
        <div className={styles.dismissArea} aria-hidden="true" onPointerDown={interactive ? dismiss : undefined} />
        <motion.div className={styles.menuAnchor} style={menu.kind === "item" ? { top: menu.top, right: menu.right } : undefined}
          initial={initialMenu ? false : { scale: 0.96, y: -4 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -4 }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
          <BookmarkMenu variant={menu.kind} id={menuId} autoFocus={interactive} onDismiss={interactive ? dismiss : undefined}
            onDelete={interactive && onDelete && menu.kind === "item" ? () => {
              trigger.current = content.current;
              onDelete(menu.entryId); dismiss();
            } : undefined} />
        </motion.div>
      </motion.div>}
    </AnimatePresence>
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
