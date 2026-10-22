import type { KeyboardEvent } from "react";
import { GlanceCard, type GlanceCardProps } from "./GlanceCard";
import styles from "./GlanceCard.module.css";

export interface GlanceCardItem extends GlanceCardProps {
  id: string;
}

export const DEFAULT_GLANCE_CARDS: readonly GlanceCardItem[] = [
  { id: "rewards", variant: "rewards" },
  { id: "sports", variant: "sports" },
  { id: "create", variant: "create" },
  { id: "money", variant: "money" },
  { id: "settings", variant: "settings" },
];

export interface GlanceCardGroupProps {
  items?: readonly GlanceCardItem[];
  onCardClick?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

function navigateCards(event: KeyboardEvent<HTMLDivElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const cards = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-glance-card]:not(:disabled)"));
  const current = cards.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1
    : Math.max(0, Math.min(cards.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
  // Native focus also scrolls an off-screen card into the horizontal viewport.
  cards[next]?.focus();
}

/** Hugs its fixed-size cards. The embedding view can constrain its width via className to enable scrolling. */
export function GlanceCardGroup({
  items = DEFAULT_GLANCE_CARDS,
  onCardClick,
  ariaLabel = "Glance cards",
  className,
}: GlanceCardGroupProps) {
  return (
    <div
      className={[styles.group, className].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={navigateCards}
    >
      {items.map(({ id, onClick, ...props }) => (
        <GlanceCard
          key={id}
          {...props}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) onCardClick?.(id);
          }}
        />
      ))}
    </div>
  );
}
