import { Settings20Regular } from "@fluentui/react-icons";
import type { ButtonHTMLAttributes } from "react";
import styles from "./GlanceCard.module.css";

const rewardsIcon = new URL("./assets/rewards.svg", import.meta.url).href;
const createIcon = new URL("./assets/create.svg", import.meta.url).href;
const moneyIcon = new URL("./assets/money.svg", import.meta.url).href;
const sportsIcon = new URL("./assets/sports.svg", import.meta.url).href;
const teamBackground = new URL("./assets/team-background.png", import.meta.url).href;
const patriotsLogo = new URL("./assets/patriots.png", import.meta.url).href;
const jetsLogo = new URL("./assets/jets.png", import.meta.url).href;

export type GlanceCardVariant = "rewards" | "sports" | "create" | "money" | "settings";
export type GlanceSportsState = "cold-start" | "upcoming" | "live" | "final";

export interface GlanceSportsContent {
  matchup: string;
  status: string;
  date: string;
  time: string;
  score: string;
  period: string;
  homeLogoSrc: string;
  awayLogoSrc: string;
}

export interface GlanceCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  variant?: GlanceCardVariant;
  /** Visible card heading. Defaults to the corresponding Figma fixture. */
  title?: string;
  /** Rewards total or market change. */
  value?: string;
  /** Supporting copy for Create with AI, Settings, and Sports cold start. */
  description?: string;
  /** Sports lifecycle state; defaults to Upcoming for existing homepage groups. */
  sportsState?: GlanceSportsState;
  /** Game data; bundled logos are the exact Figma example. */
  sports?: Partial<GlanceSportsContent>;
}

const CONTENT = {
  rewards: { title: "Rewards", value: "45 / 90", description: "" },
  sports: { title: "NEP vs NYJ", value: "", description: "" },
  create: { title: "Create with AI", value: "", description: "Images and videos" },
  money: { title: "USD JPY 150.5", value: "- 2.5%", description: "" },
  settings: { title: "Settings", value: "", description: "Manage glance cards" },
} as const;

const DEFAULT_GAME: GlanceSportsContent = {
  matchup: "NEP vs NYJ",
  status: "Next",
  date: "Sat, 16 Jul",
  time: "1:00 PM",
  score: "28 - 24",
  period: "Q4 03:24",
  homeLogoSrc: patriotsLogo,
  awayLogoSrc: jetsLogo,
};

const GAME_STATUS = { "cold-start": "", upcoming: "Next", live: "Live", final: "Final" } as const;

function TeamLogo({ src }: { src: string }) {
  return (
    <span className={styles.teamLogo} aria-hidden="true">
      <img src={teamBackground} alt="" />
      <img src={src} alt="" />
    </span>
  );
}

/** Figma 5826:53496 with the four Sports states from 5912:35288. */
export function GlanceCard({
  variant = "rewards",
  title,
  value,
  description,
  sportsState = "upcoming",
  sports,
  className,
  ...buttonProps
}: GlanceCardProps) {
  const content = CONTENT[variant];
  const game = { ...DEFAULT_GAME, status: GAME_STATUS[sportsState], ...sports };
  const isSports = variant === "sports";
  const isColdStart = isSports && sportsState === "cold-start";
  const hasGame = isSports && !isColdStart;
  const isValue = variant === "rewards" || variant === "money";
  const heading = title ?? (isColdStart ? "Sports" : isSports ? game.matchup : content.title);
  const body = isValue ? value ?? content.value : description ?? (isColdStart ? "Follow your\nfavorite team" : content.description);
  const gameDetails = sportsState === "upcoming" ? `${game.date} ${game.time}`
    : sportsState === "live" ? `${game.score} ${game.period}` : game.score;

  return (
    <button
      {...buttonProps}
      type="button"
      className={[styles.card, styles[variant], className].filter(Boolean).join(" ")}
      data-glance-card={variant}
      data-sports-state={isSports ? sportsState : undefined}
      aria-label={buttonProps["aria-label"] ?? (hasGame
        ? `${heading} ${game.status} ${gameDetails}`
        : `${heading} ${body}`.replace(/\s+/g, " "))}
    >
      <span className={styles.header}>
        <span className={styles.heading}>{heading}</span>
        {hasGame && (
          <span className={styles.badge}>
            {sportsState === "live" && <span className={styles.liveDot} aria-hidden="true" />}
            {game.status}
          </span>
        )}
      </span>
      {hasGame ? (
        <span className={styles.game}>
          <TeamLogo src={game.homeLogoSrc} />
          {sportsState === "upcoming" ? (
            <span className={styles.schedule}>
              <span>{game.date}</span>
              <span>{game.time}</span>
            </span>
          ) : (
            <span className={styles.scoreContent}>
              <span className={styles.score}>{game.score}</span>
              {sportsState === "live" && <span className={styles.clock}>{game.period}</span>}
            </span>
          )}
          <TeamLogo src={game.awayLogoSrc} />
        </span>
      ) : (
        <span className={styles.content}>
          <span className={isValue ? styles.value : styles.description}>
            {body}
          </span>
          <span className={styles.icon} aria-hidden="true">
            {variant === "rewards" && <img src={rewardsIcon} alt="" />}
            {variant === "create" && <img src={createIcon} alt="" />}
            {variant === "money" && <img src={moneyIcon} alt="" />}
            {isColdStart && <img src={sportsIcon} alt="" />}
            {variant === "settings" && <Settings20Regular />}
          </span>
        </span>
      )}
    </button>
  );
}
