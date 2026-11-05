import { useEffect, useRef } from "react";
import { useIsPresent } from "motion/react";
import {
  Alert24Regular, ChevronLeft24Regular, DarkTheme24Regular, Globe24Regular,
  Home24Regular, Info24Regular, Location24Regular, LockShield24Regular,
  Person24Regular, PersonFeedback24Regular, Search24Regular, ShieldKeyhole24Regular,
} from "@fluentui/react-icons";
import { AppHeader, AppList, AppListCard, IOSStatusBar } from "../../components";
import type { ProfileAccount } from "../Profile/Profile.data";
import styles from "./Settings.module.css";

const sections = [
  { title: "General", rows: [
    { title: "Location", Icon: Location24Regular },
    { title: "Privacy", Icon: ShieldKeyhole24Regular },
    { title: "Region and language", Icon: Globe24Regular },
    { title: "Permissions", Icon: LockShield24Regular },
  ] },
  { title: "Preferences", rows: [
    { title: "Theme", Icon: DarkTheme24Regular },
    { title: "Search", Icon: Search24Regular },
    { title: "Notifications", Icon: Alert24Regular },
    { title: "Homepage layout", Icon: Home24Regular },
  ] },
  { title: "Others", rows: [
    { title: "Feedback", Icon: PersonFeedback24Regular },
    { title: "About", Icon: Info24Regular },
  ] },
];

export interface SettingsProps {
  /** Omitted only in the standalone Figma fixture; the prototype passes its actual account. */
  account?: ProfileAccount | null;
  timeSource?: "fixed" | "system";
  active?: boolean;
  onBack?: () => void;
}

/** C3 3569:18888. Setting destinations are supplied separately when their designs are available. */
export function Settings({ account = { email: "Kate_gaming@hotmail.com" }, timeSource = "fixed", active = true, onBack }: SettingsProps) {
  const root = useRef<HTMLElement>(null);
  const present = useIsPresent();
  const inactive = !active || !present;
  const interactive = Boolean(onBack);
  const accountLabel = account?.email?.trim() || account?.name?.trim() || "Tap to sign in";
  useEffect(() => {
    if (active && interactive) root.current?.querySelector<HTMLButtonElement>('[aria-label="Back to Profile"]')?.focus({ preventScroll: true });
  }, [active, interactive]);

  return <main ref={root} className={styles.root} aria-label="Settings page"
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title="Settings" className={styles.appHeader}
        leftAction={{ label: "Back to Profile", icon: <ChevronLeft24Regular />, onClick: onBack,
          "aria-disabled": !onBack || undefined, tabIndex: onBack ? 0 : -1 }} rightActions={[]} />
    </div>
    <div className={styles.scrollContent} role="region" aria-label="Settings content" tabIndex={0}>
      <section aria-label="Account">
        <AppList variant="section-header" title="Account" showRightControl={false} className={`${styles.sectionHeader} ${styles.firstHeader}`} />
        <div className={styles.cardInset}>
          <AppListCard className={styles.listCard} ariaLabel="Account settings">
            <AppList variant="yml" title={accountLabel} logo={<Person24Regular aria-hidden="true" />}
              showDivider={false} showRightControl={false} />
          </AppListCard>
        </div>
      </section>
      {sections.map(section => <section key={section.title} aria-label={section.title}>
        <AppList variant="section-header" title={section.title} showRightControl={false} className={styles.sectionHeader} />
        <div className={styles.cardInset}>
          <AppListCard className={styles.listCard} ariaLabel={`${section.title} settings`}>
            {section.rows.map(({ title, Icon }, index) => <AppList key={title} variant="yml" title={title}
              logo={<Icon aria-hidden="true" />} showRightControl={false} showDivider={index < section.rows.length - 1} />)}
          </AppListCard>
        </div>
      </section>)}
    </div>
  </main>;
}
