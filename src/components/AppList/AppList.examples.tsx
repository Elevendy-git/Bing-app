import { useState } from "react";
import {
  FEED_CARD_AD_IMAGE,
  FEED_CARD_MULTI_IMAGE,
  FEED_CARD_SINGLE_IMAGE,
  FEED_CARD_WATCH_IMAGE,
} from "../FeedCard/FeedCard.assets";
import { AppList, type AppListProps, type AppListVariant } from "./AppList";
import { AppListCard } from "./AppListCard";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import styles from "../PreviewWorkbench/PreviewConfigurator.module.css";
import previewStyles from "./AppList.examples.module.css";

export const LIST_VARIANTS = [
  ["YML", "yml"],
  ["Trending", "trending"],
  ["AS", "as"],
  ["AS Hub page", "as-hub-page"],
  ["Bing search history", "bing-search-history"],
  ["Copilot history", "copilot-history"],
] as const;

type SelectableListVariant = Exclude<AppListVariant, "section-header">;

function createLogoDataUrl(
  text: string,
  background: string,
  foreground = "#ffffff",
) {
  const fontSize = text.length > 2 ? 6 : text.length > 1 ? 7 : 10;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="${background}"/><text x="12" y="12.5" fill="${foreground}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const LIST_LOGOS = {
  colorado: createLogoDataUrl("C", "#0878be"),
  travel: createLogoDataUrl("T+L", "#151515"),
  epicurious: createLogoDataUrl("E", "#d3212d"),
  condeNast: createLogoDataUrl("CNT", "#292929"),
  msn: createLogoDataUrl("msn", "#1685ea"),
  yellowPages: createLogoDataUrl("YP", "#ffd400", "#1d1d1d"),
  wired: createLogoDataUrl("W", "#111111"),
  espn: createLogoDataUrl("E", "#d71920"),
  ap: createLogoDataUrl("AP", "#ef2b2d"),
  cnbc: createLogoDataUrl("C", "#1473e6"),
  imdb: createLogoDataUrl("IMDb", "#f5c518", "#111111"),
  horoscope: createLogoDataUrl("✦", "#7656d6"),
  medium: createLogoDataUrl("M", "#242424"),
  microsoft: createLogoDataUrl("MS", "#737373"),
  github: createLogoDataUrl("GH", "#24292f"),
  figma: createLogoDataUrl("F", "#a259ff"),
} as const;

const MULTI_EXAMPLES: Record<SelectableListVariant, AppListProps[]> = {
  yml: [
    {
      title: "Colorado To Offer In-person Voting...",
      logoSrc: LIST_LOGOS.colorado,
      logoAlt: "Colorado",
    },
    {
      title: "A guide to this weekend's best events",
      logoSrc: LIST_LOGOS.travel,
      logoAlt: "Travel + Leisure",
    },
    {
      title: "Five easy recipes for busy weeknights",
      logoSrc: LIST_LOGOS.epicurious,
      logoAlt: "Epicurious",
    },
    {
      title: "What to know before your next trip",
      logoSrc: LIST_LOGOS.condeNast,
      logoAlt: "Condé Nast Traveler",
    },
    {
      title: "The stories people are reading today",
      logoSrc: LIST_LOGOS.msn,
      logoAlt: "MSN",
    },
  ],
  trending: [
    { rank: 1, title: "Sharks at Capitals" },
    {
      rank: 2,
      title: "The seaside towns keeping summer going",
      thumbnailSrc: FEED_CARD_SINGLE_IMAGE,
      thumbnailAlt: "A quiet seaside view",
    },
    {
      rank: 3,
      title: "Wildlife returns to the rainforest river",
      thumbnailSrc: FEED_CARD_WATCH_IMAGE,
      thumbnailAlt: "A rainforest beside a river",
    },
    {
      rank: 4,
      title: "Why walking meetings are back",
      thumbnailSrc: FEED_CARD_MULTI_IMAGE,
      thumbnailAlt: "People walking in different directions",
    },
    {
      rank: 5,
      title: "Collectible art toys surprise designers",
      thumbnailSrc: FEED_CARD_AD_IMAGE,
      thumbnailAlt: "Colorful collectible characters",
    },
  ],
  as: [
    {
      title: "Weather",
      emphasizedTitle: "today",
      rightLogoSrc: LIST_LOGOS.msn,
      rightLogoAlt: "MSN",
    },
    {
      title: "Restaurants near",
      emphasizedTitle: "me",
      rightLogoSrc: LIST_LOGOS.yellowPages,
      rightLogoAlt: "Yellow Pages",
    },
    {
      title: "Latest technology",
      emphasizedTitle: "news",
      rightLogoSrc: LIST_LOGOS.wired,
      rightLogoAlt: "Wired",
    },
    {
      title: "Weekend travel",
      emphasizedTitle: "ideas",
      rightLogoSrc: LIST_LOGOS.travel,
      rightLogoAlt: "Travel + Leisure",
    },
    {
      title: "Live sports",
      emphasizedTitle: "scores",
      rightLogoSrc: LIST_LOGOS.espn,
      rightLogoAlt: "ESPN",
    },
  ],
  "as-hub-page": [
    {
      title: "Weather",
      emphasizedTitle: "today",
      rightLogoSrc: LIST_LOGOS.msn,
      rightLogoAlt: "MSN",
    },
    { title: "Top stories", rightLogoSrc: LIST_LOGOS.ap, rightLogoAlt: "AP" },
    {
      title: "Stock market update",
      rightLogoSrc: LIST_LOGOS.cnbc,
      rightLogoAlt: "CNBC",
    },
    {
      title: "Movies playing nearby",
      rightLogoSrc: LIST_LOGOS.imdb,
      rightLogoAlt: "IMDb",
    },
    {
      title: "Daily horoscope",
      rightLogoSrc: LIST_LOGOS.horoscope,
      rightLogoAlt: "Horoscope",
    },
  ],
  "bing-search-history": [
    {
      title: "Medium",
      subtitle: "https://medium.com/",
      logoSrc: LIST_LOGOS.medium,
      logoAlt: "Medium",
    },
    {
      title: "Microsoft Design",
      subtitle: "https://microsoft.design/",
      logoSrc: LIST_LOGOS.microsoft,
      logoAlt: "Microsoft",
    },
    {
      title: "MSN",
      subtitle: "https://www.msn.com/",
      logoSrc: LIST_LOGOS.msn,
      logoAlt: "MSN",
    },
    {
      title: "GitHub",
      subtitle: "https://github.com/",
      logoSrc: LIST_LOGOS.github,
      logoAlt: "GitHub",
    },
    {
      title: "Figma",
      subtitle: "https://www.figma.com/",
      logoSrc: LIST_LOGOS.figma,
      logoAlt: "Figma",
    },
  ],
  "copilot-history": [
    {
      title: "Create a research report on pop music",
      subtitle: "Tuesday, Feb 10",
    },
    { title: "Plan a three-day city break", subtitle: "Monday, Feb 9" },
    { title: "Explain quantum computing simply", subtitle: "Sunday, Feb 8" },
    { title: "Draft an email to my project team", subtitle: "Friday, Feb 6" },
    { title: "Compare electric car options", subtitle: "Thursday, Feb 5" },
  ],
};

type CardMode = "single" | "multiple";

export function ListCardConfigurator() {
  const [mode, setMode] = useState<CardMode>("single");
  const [selectedVariant, setSelectedVariant] =
    useState<SelectableListVariant>("yml");
  const selectedLabel =
    LIST_VARIANTS.find(([, variant]) => variant === selectedVariant)?.[0] ?? "YML";

  return (
    <PreviewConfigurator label="List Card controls" controls={
      <>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Layout</span>
          <div className={styles.modeSwitch} role="group" aria-label="Card layout">
            <button
              className={styles.modeButton}
              type="button"
              aria-pressed={mode === "single"}
              onClick={() => setMode("single")}
            >
              Single list
            </button>
            <button
              className={styles.modeButton}
              type="button"
              aria-pressed={mode === "multiple"}
              onClick={() => setMode("multiple")}
            >
              Multi list
            </button>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>List type</span>
          <span className={styles.selectControl}>
            <select
              className={styles.typeSelect}
              value={selectedVariant}
              onChange={(event) =>
                setSelectedVariant(
                  event.currentTarget.value as SelectableListVariant,
                )
              }
            >
              {LIST_VARIANTS.map(([label, variant]) => (
                <option key={variant} value={variant}>
                  {label}
                </option>
              ))}
            </select>
            <svg
              className={styles.selectChevron}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </span>
        </label>
      </>
    }>
      {mode === "single" ? (
        <div className={previewStyles.cardPreview}>
          <AppListCard ariaLabel={`${selectedLabel} single-list card`}>
            <AppList variant={selectedVariant} showDivider={false} />
          </AppListCard>
        </div>
      ) : (
        <div className={previewStyles.cardPreview}>
          <AppList
            variant="section-header"
            title={selectedLabel}
            rightLabel="View"
            showDivider={false}
          />
          <AppListCard ariaLabel={`${selectedLabel} multi-list card`}>
            {MULTI_EXAMPLES[selectedVariant].map((example, index, examples) => (
              <AppList
                key={`${selectedVariant}-${index}`}
                {...example}
                variant={selectedVariant}
                showDivider={index < examples.length - 1}
              />
            ))}
          </AppListCard>
        </div>
      )}
    </PreviewConfigurator>
  );
}
