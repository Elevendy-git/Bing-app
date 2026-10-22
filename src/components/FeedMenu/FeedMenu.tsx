import type { CSSProperties } from "react";
import { MenuList, type MenuListProps } from "../MenuList";
import { MenuIcon } from "../MenuList/MenuIcon";
import type { FeedFollowTarget } from "../FeedCard";
import styles from "../MenuList/MenuList.module.css";

const icons = {
  like: new URL("./assets/like.svg", import.meta.url).href,
  dislike: new URL("./assets/dislike.svg", import.meta.url).href,
  follow: new URL("./assets/follow.svg", import.meta.url).href,
  unfollow: new URL("./assets/unfollow.svg", import.meta.url).href,
  block: new URL("./assets/block.svg", import.meta.url).href,
  preferences: new URL("./assets/preferences.svg", import.meta.url).href,
  "preferences-following": new URL("./assets/preferences-following.svg", import.meta.url).href,
};

function FeedMenuIcon({ name }: { name: keyof typeof icons }) {
  return <span className={styles.asset} style={{ "--gnrc-menu-icon": `url("${icons[name]}")` } as CSSProperties} />;
}

export const PREVIEW_FEED_TARGET: FeedFollowTarget = { kind: "topic", name: "FIFA World Cup" };

export interface FeedMenuProps extends Pick<MenuListProps, "className" | "onDismiss" | "autoFocus"> {
  target?: FeedFollowTarget;
  followed?: boolean;
  onToggleFollow?: () => void;
}

/** C3 3587:10791 / 3587:11176. Only supplied actions are enabled. */
export function FeedMenu({ target = PREVIEW_FEED_TARGET, followed = false, onToggleFollow, ...props }: FeedMenuProps) {
  return <MenuList {...props} layout="sheet" label={`Feed options for ${target.name}`} items={[
    { id: "share", label: "Share", icon: <MenuIcon name="share" /> },
    { id: "more", label: "More stories like this", icon: <FeedMenuIcon name="like" /> },
    { id: "fewer", label: "Fewer stories like this", icon: <FeedMenuIcon name="dislike" /> },
    { id: "follow", label: `${followed ? "Unfollow" : "Follow"} ${target.name}`,
      icon: <FeedMenuIcon name={followed ? "unfollow" : "follow"} />, onSelect: onToggleFollow },
    { id: "block", label: `Block ${target.name}`, icon: <FeedMenuIcon name="block" /> },
    { id: "preferences", label: "News preferences", icon: <FeedMenuIcon name={followed ? "preferences-following" : "preferences"} /> },
    { id: "feedback", label: "Feedback", icon: <MenuIcon name="feedback" /> },
  ]} />;
}
