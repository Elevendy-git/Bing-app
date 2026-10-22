import { ChevronRight20Regular } from "@fluentui/react-icons";
import { useCallback, useRef, useState } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PreviewExpandedScreen } from "./PreviewExpandedScreen";
import { PreviewScreenTile } from "./PreviewScreenTile";
import type { PreviewScreen } from "./previewTypes";
import styles from "./PreviewKeyScreens.module.css";

export function PreviewKeyScreens({ screens, theme }: { screens: readonly PreviewScreen[]; theme: PreviewTheme }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeExpandedScreen = useCallback(() => setExpandedId(null), []);
  const expandedScreen = screens.find((screen) => screen.id === expandedId);
  const groups = new Map<string, PreviewScreen[]>();
  for (const screen of screens) {
    const title = screen.group ?? "Key screens";
    const items = groups.get(title) ?? [];
    items.push(screen);
    groups.set(title, items);
  }

  return (
    <section className={styles.gallery} aria-label="Key screens">
      {Array.from(groups, ([title, items]) => (
        <details className={styles.group} key={title} open>
          <summary className={styles.groupHeading}>
            <h2>{title}</h2>
            <ChevronRight20Regular aria-hidden="true" />
          </summary>
          <div className={styles.screenGrid}>
            {items.map((screen) => (
              <PreviewScreenTile key={screen.id} screen={screen} theme={theme} onOpen={(trigger) => {
                triggerRef.current = trigger;
                setExpandedId(screen.id);
              }} />
            ))}
          </div>
        </details>
      ))}
      {screens.length === 0 && <p className={styles.emptyState}>No key screens have been added yet.</p>}
      {expandedScreen && <PreviewExpandedScreen screen={expandedScreen} theme={theme}
        returnFocusTo={triggerRef.current} onClose={closeExpandedScreen} />}
    </section>
  );
}
