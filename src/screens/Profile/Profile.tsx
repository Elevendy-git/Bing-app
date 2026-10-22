import { useEffect, useRef } from "react";
import { useIsPresent } from "motion/react";
import {
  Alert24Regular, ArrowDownload24Regular, Bookmark24Regular, ChevronLeft24Regular,
  ChevronRight16Filled, ChevronRight20Filled, History24Regular, Reward24Regular,
  Settings24Regular, StarEdit24Regular,
} from "@fluentui/react-icons";
import { AppHeader, AppList, AppListCard, Avatar, IOSStatusBar } from "../../components";
import { PROFILE_ACCOUNTS, profileAvatar, type ProfileAccount } from "./Profile.data";
import styles from "./Profile.module.css";

const background = new URL("./assets/profile-background.svg", import.meta.url).href;
const gifts = new URL("./assets/rewards-gift-cards.png", import.meta.url).href;
const rewards = [
  { label: "Total points", value: "2,456", icon: new URL("./assets/rewards-medallion.svg", import.meta.url).href },
  { label: "Daily points", value: "30/270", icon: new URL("./assets/rewards-coins.svg", import.meta.url).href },
  { label: "Daily streaks", value: "3 days", icon: new URL("./assets/rewards-streak.svg", import.meta.url).href },
];
const sections = [
  { title: "General", rows: [
    { title: "Microsoft Rewards", Icon: Reward24Regular },
    { title: "History", Icon: History24Regular, destination: "history" },
    { title: "Bookmarks", Icon: Bookmark24Regular, destination: "bookmarks" },
    { title: "Downloads", Icon: ArrowDownload24Regular },
  ] },
  { title: "Preferences", rows: [
    { title: "News preferences", Icon: StarEdit24Regular },
    { title: "Settings", Icon: Settings24Regular },
  ] },
];

export interface ProfileProps {
  account?: ProfileAccount | null;
  timeSource?: "fixed" | "system";
  active?: boolean;
  onBack?: () => void;
  onViewHistory?: () => void;
  onViewBookmarks?: () => void;
}

/** C3 Profile: photo, name/email initial, and signed-out states share the same layout. */
export function Profile({ account = PROFILE_ACCOUNTS.image, timeSource = "fixed", active = true, onBack, onViewHistory, onViewBookmarks }: ProfileProps) {
  const root = useRef<HTMLElement>(null);
  const present = useIsPresent();
  const inactive = !active || !present;
  const interactive = Boolean(onBack);
  useEffect(() => {
    if (interactive && active) root.current?.querySelector<HTMLButtonElement>('[aria-label="Back to Homepage"]')?.focus({ preventScroll: true });
  }, [interactive, active]);

  return <main ref={root} className={styles.root} aria-label="Profile page"
    data-profile-state={account ? profileAvatar(account).variant : "signed-out"}
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <img className={styles.background} src={background} alt="" draggable={false} />
    <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
    <div className={styles.scrollContent} role="region" aria-label="Profile content" tabIndex={0}>
      <AppHeader title="" aria-label="Profile header" className={styles.header}
        leftAction={{ label: "Back to Homepage", icon: <ChevronLeft24Regular />, onClick: onBack, "aria-disabled": !onBack || undefined }}
        rightActions={[{ label: "Notifications", icon: <Alert24Regular />, "aria-disabled": true, tabIndex: -1 }]} />
      <div className={styles.identity}>
        <Avatar {...profileAvatar(account)} size="large" />
        {account ? <div className={styles.identityCopy}>
          <h1>{account.name?.trim() || account.email?.trim()}</h1>
          {account.email?.trim() && <div className={styles.email}><span>{account.email.trim()}</span><ChevronRight16Filled aria-hidden="true" /></div>}
        </div> : <h1 className={styles.signIn}>Tap to sign in <ChevronRight20Filled aria-hidden="true" /></h1>}
      </div>
      <div className={styles.content}>
        {account ? <div className={`${styles.card} ${styles.rewards}`} role="group" aria-label="Microsoft Rewards summary">
          {rewards.map(item => <div key={item.label} className={styles.stat}>
            <img src={item.icon} alt="" draggable={false} />
            <strong>{item.value}</strong><span>{item.label}</span>
          </div>)}
        </div> : <div className={`${styles.card} ${styles.promo}`} role="group" aria-label="Microsoft Rewards introduction">
          <div className={styles.promoCopy}>
            <p>Earn free gift cards and more with Microsoft Rewards</p>
            <span className={styles.explore}>Explore now</span>
          </div>
          <img className={styles.gifts} src={gifts} width={130} height={122} alt="" draggable={false} />
        </div>}
        {sections.map(section => <section key={section.title} aria-label={section.title}>
          <AppList variant="section-header" title={section.title} showRightControl={false} className={styles.sectionHeader} />
          <AppListCard className={styles.listCard} ariaLabel={`${section.title} options`}>
            {section.rows.map(({ title, Icon, destination }, index) => <AppList key={title} variant="yml" title={title}
              onClick={destination === "history" ? onViewHistory : destination === "bookmarks" ? onViewBookmarks : undefined}
              logo={<Icon aria-hidden="true" />} showRightControl={false} showDivider={index < section.rows.length - 1} />)}
          </AppListCard>
        </section>)}
      </div>
    </div>
  </main>;
}
