import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedFollowTarget, FeedMoreOptionsHandler } from "../../components/FeedCard";
import { PREVIEW_FEED_TARGET } from "../../components/FeedMenu";

export type FeedOverlayState = "menu" | "following-menu" | "followed-toast" | "unfollowed-toast";
export const feedFollowKey = (target: FeedFollowTarget) => JSON.stringify([target.kind, target.id ?? target.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")]);
export const feedFollowMessage = (followed: boolean) => `You've ${followed ? "followed" : "unfollowed"} this channel`;
interface FollowToast { id: number; target: FeedFollowTarget; previouslyFollowed: boolean; message: string }

/** Local prototype preferences, shared across cards and cleared by Prototype Reset. */
export function useFeedFollow(initialState?: FeedOverlayState) {
  const startsFollowed = initialState === "following-menu" || initialState === "followed-toast";
  const [followed, setFollowed] = useState(() => new Set(startsFollowed ? [feedFollowKey(PREVIEW_FEED_TARGET)] : []));
  const [menu, setMenu] = useState<FeedFollowTarget | null>(initialState?.endsWith("menu") ? PREVIEW_FEED_TARGET : null);
  const [menuPresented, setMenuPresented] = useState(Boolean(menu));
  const [toast, setToast] = useState<FollowToast | null>(initialState?.endsWith("toast")
    ? { id: 0, target: PREVIEW_FEED_TARGET, previouslyFollowed: !startsFollowed, message: feedFollowMessage(startsFollowed) } : null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (!menuPresented && opener.current?.isConnected && !opener.current.closest("[inert], [hidden]")) {
      opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [menuPresented]);

  const setFollowing = (target: FeedFollowTarget, value: boolean) => setFollowed(current => {
    const next = new Set(current);
    if (value) next.add(feedFollowKey(target)); else next.delete(feedFollowKey(target));
    return next;
  });
  const isFollowed = (target: FeedFollowTarget) => followed.has(feedFollowKey(target));
  const openMenu: FeedMoreOptionsHandler = (target, trigger) => {
    opener.current = trigger;
    setToast(null);
    setMenu(target);
    setMenuPresented(true);
  };
  const closeMenu = useCallback(() => setMenu(null), []);
  const finishClose = useCallback(() => setMenuPresented(false), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const toggleFollow = () => {
    if (!menu) return;
    const previouslyFollowed = isFollowed(menu);
    setFollowing(menu, !previouslyFollowed);
    setToast({ id: ++sequence.current, target: menu, previouslyFollowed, message: feedFollowMessage(!previouslyFollowed) });
    closeMenu();
  };
  const undo = () => {
    if (!toast) return;
    setFollowing(toast.target, toast.previouslyFollowed);
    dismissToast();
  };
  return { menu, menuPresented, toast, isFollowed, openMenu, closeMenu, finishClose, toggleFollow, undo, dismissToast };
}
