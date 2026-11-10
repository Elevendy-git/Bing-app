import { useEffect, useRef, useState } from "react";
import { AnimatePresence, useIsPresent } from "motion/react";
import {
  Alert24Regular, Bookmark24Regular, ChevronLeft24Regular,
  ChevronRight16Filled, ChevronRight20Filled, History24Regular, Reward24Regular,
  Settings24Regular, StarEdit24Regular,
} from "@fluentui/react-icons";
import { AppHeader, AppList, AppListCard, Avatar, ConfirmationDialog, IOSStatusBar } from "../../components";
import { useOverlayPresence } from "../../motion/MotionPresence";
import { normalizeRewardsAccount, type RewardsSnapshot } from "../../auth/rewards";
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
    { title: "Microsoft Rewards", Icon: Reward24Regular, destination: "rewards" },
    { title: "History", Icon: History24Regular, destination: "history" },
    { title: "Bookmarks", Icon: Bookmark24Regular, destination: "bookmarks" },
  ] },
  { title: "Preferences", rows: [
    { title: "News preferences", Icon: StarEdit24Regular },
    { title: "Settings", Icon: Settings24Regular, destination: "settings" },
  ] },
];

export interface ProfileProps {
  account?: ProfileAccount | null;
  timeSource?: "fixed" | "system";
  active?: boolean;
  onBack?: () => void;
  onViewHistory?: () => void;
  onViewBookmarks?: () => void;
  onViewSettings?: () => void;
  /** Opens the official Rewards site; does not expose this app's account tokens. */
  onViewRewards?: () => void;
  rewardsSnapshot?: RewardsSnapshot | null;
  /** Omitted in passive design fixtures. Identity is owned outside this screen. */
  authentication?: ProfileAuthentication;
}

export interface ProfileAuthentication {
  provider: "demo" | "microsoft";
  pending?: "initializing" | "sign-in" | "sign-out" | null;
  error?: string | null;
  onSignIn: () => void;
  onRetrySignIn?: () => void;
  onSignOut: () => void;
}

/** C3 Profile: photo, name/email initial, and signed-out states share the same layout. */
export function Profile({ account = PROFILE_ACCOUNTS.image, timeSource = "fixed", active = true, onBack, onViewHistory, onViewBookmarks, onViewSettings, onViewRewards, rewardsSnapshot, authentication }: ProfileProps) {
  const root = useRef<HTMLElement>(null);
  const identityAction = useRef<HTMLButtonElement>(null);
  const wasSignedIn = useRef(Boolean(account));
  const [accountDialog, setAccountDialog] = useState<"sign-in" | "account" | null>(null);
  const present = useIsPresent();
  const inactive = !active || !present;
  const interactive = Boolean(onBack);
  const microsoft = authentication?.provider === "microsoft";
  const captured = microsoft && account?.email && rewardsSnapshot?.accountEmail === normalizeRewardsAccount(account.email) ? rewardsSnapshot : null;
  const rewardsUnavailable = Boolean(microsoft && account && !captured);
  const rewardStats = captured ? [
    { ...rewards[0], label: "Available points", value: captured.availablePoints.toLocaleString("en-US") },
    ...(captured.readyToClaim === null ? [] : [{ ...rewards[1], label: "Ready to claim", value: captured.readyToClaim.toLocaleString("en-US") }]),
    ...(captured.dailyStreakDays === null ? [] : [{ ...rewards[2], label: "Daily streaks", value: `${captured.dailyStreakDays} ${captured.dailyStreakDays === 1 ? "day" : "days"}` }]),
  ] : rewardsUnavailable ? [
    { ...rewards[0], label: "Available points", value: "—" },
    { ...rewards[1], label: "Ready to claim", value: "—" },
    { ...rewards[2], value: "—" },
  ] : rewards;
  const pending = authentication?.pending;
  const feedback = authentication?.error || (pending === "initializing" ? "Preparing Microsoft sign-in…"
    : pending === "sign-in" ? "Complete sign-in in the Microsoft window."
    : pending === "sign-out" ? "Signing out…" : null);
  const accountOverlay = useOverlayPresence(Boolean(accountDialog), () => {
    if (!inactive) identityAction.current?.focus({ preventScroll: true });
  });
  useEffect(() => { if (inactive) setAccountDialog(null); }, [inactive]);
  useEffect(() => {
    if (interactive && active) root.current?.querySelector<HTMLButtonElement>('[aria-label="Back to Homepage"]')?.focus({ preventScroll: true });
  }, [interactive, active]);
  useEffect(() => {
    if (wasSignedIn.current !== Boolean(account) && !inactive && !accountOverlay.presented) {
      identityAction.current?.focus({ preventScroll: true });
    }
    wasSignedIn.current = Boolean(account);
  }, [account, inactive, accountOverlay.presented]);

  return <main ref={root} className={styles.root} aria-label="Profile page"
    data-profile-state={account ? profileAvatar(account).variant : "signed-out"}
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <img className={styles.background} src={background} alt="" draggable={false} />
    <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
    <div className={styles.scrollContent} role="region" aria-label="Profile content" tabIndex={0}
      {...(accountOverlay.presented ? { inert: "" } : {})}>
      <AppHeader title="" aria-label="Profile header" className={styles.header}
        leftAction={{ label: "Back to Homepage", icon: <ChevronLeft24Regular />, onClick: onBack, "aria-disabled": !onBack || undefined }}
        rightActions={[{ label: "Notifications", icon: <Alert24Regular />, "aria-disabled": true, tabIndex: -1 }]} />
      <div className={styles.identity}>
        <Avatar {...profileAvatar(account)} size="large" />
        {account ? <div className={styles.identityCopy}>
          <h1>{account.name?.trim() || account.email?.trim()}</h1>
          {account.email?.trim() && (authentication
            ? <button ref={identityAction} type="button" className={`${styles.email} ${styles.accountAction}`} aria-label={microsoft ? "Manage Microsoft account" : "Manage demo account"} aria-haspopup="dialog" disabled={Boolean(pending)}
              onClick={() => setAccountDialog("account")}><span>{account.email.trim()}</span><ChevronRight16Filled aria-hidden="true" /></button>
            : <div className={styles.email}><span>{account.email.trim()}</span><ChevronRight16Filled aria-hidden="true" /></div>)}
        </div> : <h1 className={styles.signIn}>{authentication
          ? <button ref={identityAction} type="button" className={`${styles.signIn} ${styles.accountAction}`} aria-haspopup="dialog"
            disabled={Boolean(pending)} onClick={() => microsoft ? authentication.onSignIn() : setAccountDialog("sign-in")}>Tap to sign in <ChevronRight20Filled aria-hidden="true" /></button>
          : <>Tap to sign in <ChevronRight20Filled aria-hidden="true" /></>}</h1>}
        {feedback && <p className={styles.authFeedback} role={authentication?.error ? "alert" : "status"}>{feedback}</p>}
        {pending === "sign-in" && authentication?.onRetrySignIn && <button type="button"
          className={`${styles.accountAction} ${styles.authRetry}`} onClick={authentication.onRetrySignIn}>Closed the window? Try again</button>}
      </div>
      <div className={styles.content}>
        {account ? <div className={styles.card} role="group" aria-label="Microsoft Rewards summary">
          <div className={styles.rewards}>
            {rewardStats.map(item => <div key={item.label} className={styles.stat}>
              <img src={item.icon} alt="" draggable={false} />
              <strong>{item.value}</strong><span>{item.label}</span>
            </div>)}
          </div>
          {rewardsUnavailable && <div className={styles.rewardsUnavailable}>
            <p>Points are unavailable here.</p>
            {onViewRewards && <button type="button" className={styles.rewardsLink} onClick={onViewRewards}>View points</button>}
          </div>}
        </div> : <div className={`${styles.card} ${styles.promo}`} role="group" aria-label="Microsoft Rewards introduction">
          <div className={styles.promoCopy}>
            <p>Earn free gift cards and more with Microsoft Rewards</p>
            {onViewRewards
              ? <button type="button" className={styles.explore} onClick={onViewRewards}>Explore now</button>
              : <span className={styles.explore}>Explore now</span>}
          </div>
          <img className={styles.gifts} src={gifts} width={130} height={122} alt="" draggable={false} />
        </div>}
        {sections.map(section => <section key={section.title} aria-label={section.title}>
          <AppList variant="section-header" title={section.title} showRightControl={false} className={styles.sectionHeader} />
          <AppListCard className={styles.listCard} ariaLabel={`${section.title} options`}>
            {section.rows.map(({ title, Icon, destination }, index) => <AppList key={title} variant="yml" title={title}
              onClick={destination === "history" ? onViewHistory : destination === "bookmarks" ? onViewBookmarks : destination === "settings" ? onViewSettings : destination === "rewards" ? onViewRewards : undefined}
              logo={<Icon aria-hidden="true" />} showRightControl={false} showDivider={index < section.rows.length - 1} />)}
          </AppListCard>
        </section>)}
      </div>
    </div>
    <AnimatePresence onExitComplete={accountOverlay.finishExit}>
      {accountDialog && <ConfirmationDialog key={accountDialog} role="dialog"
        title={accountDialog === "sign-in" ? "Demo sign-in" : microsoft ? "Microsoft account" : "Demo account"}
        description={accountDialog === "sign-in"
          ? `Continue as ${PROFILE_ACCOUNTS.image.name} (${PROFILE_ACCOUNTS.image.email}). This demo does not connect to Microsoft.`
          : microsoft ? `Signed in as ${account?.email || account?.name}. Sign out of this prototype? Your Microsoft account stays signed in elsewhere. History and bookmarks stay in this prototype.`
          : `Signed in as ${account?.email || account?.name}. Your history and bookmarks will stay in this prototype.`}
        confirmLabel={accountDialog === "sign-in" ? "Continue" : "Sign out"}
        cancelLabel={accountDialog === "sign-in" ? "Cancel" : "Done"} destructive={accountDialog === "account"}
        onCancel={() => setAccountDialog(null)} onConfirm={() => {
          if (accountDialog === "sign-in") authentication?.onSignIn(); else authentication?.onSignOut();
          setAccountDialog(null);
        }} />}
    </AnimatePresence>
  </main>;
}
