import {
  ArrowUpLeft16Regular,
  ChevronRight16Regular,
  History20Regular,
  History24Regular,
  MoreHorizontal20Regular,
  Search20Regular,
  Search24Regular,
} from "@fluentui/react-icons";
import { useState, type CSSProperties, type ReactNode, type MouseEventHandler } from "react";
import {
  MEDIUM_FAVICON_32,
  TRENDING_BACKGROUND,
  TRENDING_THUMBNAIL,
  YML_FAVICON,
} from "./AppList.assets";
import styles from "./AppList.module.css";

export type AppListVariant =
  | "yml"
  | "trending"
  | "as"
  | "as-hub-page"
  | "bing-search-history"
  | "copilot-history"
  | "section-header";

export interface AppListProps {
  /** Layout variant from the Figma List component set. */
  variant?: AppListVariant;
  /** Primary row copy. */
  title?: string;
  /** Optional strong autocomplete suffix used by the AS row. */
  emphasizedTitle?: string;
  /** Autocomplete input: matching text stays regular; completion text uses the strong style. */
  autocompleteQuery?: string;
  /** AS leading icon is determined by the suggestion's source, never by its row index. */
  suggestionSource?: "history" | "prediction";
  /** Secondary copy used by history rows. */
  subtitle?: string;
  /** Rank shown by the Trending variant. */
  rank?: number | string;
  /** Optional replacement for the built-in leading logo. */
  logoSrc?: string;
  /** Leading artwork whose native SVG dimensions must remain unchanged. */
  logo?: ReactNode;
  /** Accessible name for a supplied leading logo. */
  logoAlt?: string;
  /** Optional AS source logo; omitted, empty or failed images leave no placeholder. */
  rightLogoSrc?: string | null;
  /** Accessible name for a supplied AS source logo. */
  rightLogoAlt?: string;
  /** Optional replacement for the Trending thumbnail. */
  thumbnailSrc?: string;
  /** Accessible name for a supplied Trending thumbnail. */
  thumbnailAlt?: string;
  /** Matches the Figma Show Divider component property. */
  showDivider?: boolean;
  /** Matches the Figma Show Logo component property. */
  showLogo?: boolean;
  /** Matches the Figma Show Right Control component property. */
  showRightControl?: boolean;
  /** Action copy used by the Section header. */
  rightLabel?: string;
  /** Optional replacement for the variant's built-in right control. */
  rightControl?: ReactNode;
  /** Makes the complete content row actionable without changing its rest appearance. */
  onClick?: () => void;
  /** Disable the primary row action while retaining any independent trailing action. */
  disabled?: boolean;
  /** Independent trailing action, rendered beside the row button, never inside it. */
  onRightControlClick?: MouseEventHandler<HTMLButtonElement>;
  rightControlLabel?: string;
  /** Menu disclosure state for hosts that anchor a menu to the trailing action. */
  rightControlExpanded?: boolean;
  rightControlMenuId?: string;
  /** Accessible label for an actionable row. */
  ariaLabel?: string;
  /** Optional class applied to the 390 px component root. */
  className?: string;
  /** Optional style applied to the component root. */
  style?: CSSProperties;
}

type VariantDefaults = {
  title: string;
  emphasizedTitle?: string;
  subtitle?: string;
  rank?: number | string;
  rightLabel?: string;
};

const DEFAULTS: Record<AppListVariant, VariantDefaults> = {
  yml: {
    title: "Coolorado To offer In-person Voting...",
  },
  trending: {
    title: "Sharks at Capitals",
    rank: 1,
  },
  as: {
    title: "Weather",
    emphasizedTitle: "today",
  },
  "as-hub-page": {
    title: "Weather",
    emphasizedTitle: "today",
  },
  "bing-search-history": {
    title: "Medium",
    subtitle: "https://medium.com/",
  },
  "copilot-history": {
    title: "Create a research report on pop music",
    subtitle: "Tuesday, Feb 10",
  },
  "section-header": {
    title: "Open tabs",
    rightLabel: "View",
  },
};

function MediumMark() {
  return (
    <span className={styles.mediumMark} aria-hidden="true">
      <img src={MEDIUM_FAVICON_32} alt="" />
    </span>
  );
}

function YmlMark() {
  return <img className={styles.ymlMark} src={YML_FAVICON} alt="" />;
}

function LeadingVisual({
  variant,
  logo,
  logoSrc,
  logoAlt = "",
  suggestionSource,
}: Pick<AppListProps, "variant" | "logo" | "logoSrc" | "logoAlt" | "suggestionSource"> & {
  variant: AppListVariant;
}) {
  if (logo !== undefined) return <>{logo}</>;
  if (logoSrc) {
    return <img className={styles.logoImage} src={logoSrc} alt={logoAlt} />;
  }

  switch (variant) {
    case "yml":
      return <YmlMark />;
    case "as":
      return suggestionSource === "history"
        ? <History20Regular role="img" aria-label="From search history" />
        : <Search20Regular role="img" aria-label="Suggested query" />;
    case "as-hub-page":
      return suggestionSource === "history"
        ? <History24Regular role="img" aria-label="From search history" />
        : <Search24Regular role="img" aria-label="Suggested query" />;
    case "bing-search-history":
      return <MediumMark />;
    case "copilot-history":
      return <History24Regular aria-hidden="true" />;
    default:
      return null;
  }
}

function TrendingThumbnail({
  thumbnailSrc,
  thumbnailAlt = "",
}: Pick<AppListProps, "thumbnailSrc" | "thumbnailAlt">) {
  if (thumbnailSrc) {
    return (
      <img
        className={styles.thumbnailImage}
        src={thumbnailSrc}
        alt={thumbnailAlt}
      />
    );
  }

  return (
    <span className={styles.thumbnailArtwork} aria-hidden="true">
      <span className={styles.thumbnailLayers}>
        <img className={styles.thumbnailBackground} src={TRENDING_BACKGROUND} alt="" />
        <img className={styles.thumbnailForeground} src={TRENDING_THUMBNAIL} alt="" />
      </span>
    </span>
  );
}

function SuggestionLogo({ src, alt }: { src?: string | null; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const logoUrl = src?.trim();
  if (!logoUrl || failedSrc === logoUrl) return null;
  return <span className={styles.suggestionLogo}>
    <img src={logoUrl} alt={alt} onError={() => setFailedSrc(logoUrl)} />
  </span>;
}

function DefaultRightControl({
  variant,
  thumbnailSrc,
  thumbnailAlt,
  rightLogoSrc,
  rightLogoAlt = "",
}: Pick<
  AppListProps,
  "thumbnailSrc" | "thumbnailAlt" | "rightLogoSrc" | "rightLogoAlt"
> & {
  variant: AppListVariant;
}) {
  switch (variant) {
    case "trending":
      return (
        <TrendingThumbnail
          thumbnailSrc={thumbnailSrc}
          thumbnailAlt={thumbnailAlt}
        />
      );
    case "as":
    case "as-hub-page":
      return (
        <span className={styles.asControls}>
          <SuggestionLogo src={rightLogoSrc} alt={rightLogoAlt} />
          <span className={styles.actionIcon}>
            <ArrowUpLeft16Regular aria-hidden="true" />
          </span>
        </span>
      );
    case "bing-search-history":
    case "copilot-history":
      return <MoreHorizontal20Regular aria-hidden="true" />;
    default:
      return null;
  }
}

function Divider() {
  return (
    <div className={styles.dividerSlot} aria-hidden="true">
      <span className={styles.divider} />
    </div>
  );
}

function AutocompleteTitle({ title, query }: { title: string; query: string }) {
  const input = query.trim();
  if (!input) return <>{title}</>;
  const pattern = input.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  return <>{title.split(new RegExp(`(${pattern})`, "gi")).map((part, index) => part && (
    <span key={index} className={index % 2 === 0 ? styles.titleEmphasis : undefined}>{part}</span>
  ))}</>;
}

/**
 * Bing App list row set from Figma node 375:9897.
 * All content rows are exactly 390 px wide and expose the original component properties.
 */
export function AppList({
  variant = "yml",
  title,
  emphasizedTitle,
  autocompleteQuery,
  suggestionSource,
  subtitle,
  rank,
  logo,
  logoSrc,
  logoAlt,
  rightLogoSrc,
  rightLogoAlt,
  thumbnailSrc,
  thumbnailAlt,
  showDivider = true,
  showLogo = true,
  showRightControl = true,
  rightLabel,
  rightControl,
  onClick,
  disabled,
  onRightControlClick,
  rightControlLabel,
  rightControlExpanded,
  rightControlMenuId,
  ariaLabel,
  className,
  style,
}: AppListProps) {
  const defaults = DEFAULTS[variant];
  const displayTitle = title ?? defaults.title;
  const displayEmphasizedTitle =
    emphasizedTitle ?? (title === undefined ? defaults.emphasizedTitle : undefined);
  const accessibleTitle = [displayTitle, displayEmphasizedTitle]
    .filter(Boolean)
    .join(" ");
  const displaySubtitle = subtitle ?? defaults.subtitle;
  const displayRank = rank ?? defaults.rank;
  const displayRightLabel = rightLabel ?? defaults.rightLabel;
  const rootClassName = `${styles.root} ${styles[variant]} ${className ?? ""}`.trim();

  if (variant === "section-header") {
    const content = (
      <div className={styles.sectionContent}>
        <h3 className={styles.sectionTitle}>{displayTitle}</h3>
        {showRightControl ? (
          <span className={styles.sectionAction}>
            {rightControl ?? (
              <>
                <span>{displayRightLabel}</span>
                <span className={styles.sectionChevron}><ChevronRight16Regular aria-hidden="true" /></span>
              </>
            )}
          </span>
        ) : null}
      </div>
    );

    if (onClick) {
      return (
        <button
          className={rootClassName}
          style={style}
          type="button"
          aria-label={ariaLabel ?? `${displayTitle}, ${displayRightLabel}`}
          data-variant={variant}
          onClick={onClick}
          disabled={disabled}
        >
          {content}
        </button>
      );
    }

    return (
      <div className={rootClassName} style={style} data-variant={variant}>
        {content}
      </div>
    );
  }

  const trailingControl = rightControl ?? (
    <DefaultRightControl variant={variant} thumbnailSrc={thumbnailSrc}
      thumbnailAlt={thumbnailAlt} rightLogoSrc={rightLogoSrc} rightLogoAlt={rightLogoAlt} />
  );
  // History's overflow control stays separate from opening the recorded page.
  const separateRightControl = onRightControlClick || (onClick && variant === "bing-search-history");
  const content = (
    <div className={styles.content}>
      {variant === "trending" ? (
        <span className={styles.rank} aria-label={`Rank ${displayRank}`}>
          {displayRank}
        </span>
      ) : showLogo ? (
        <span className={styles.leading}>
          <LeadingVisual variant={variant} logo={logo} logoSrc={logoSrc} logoAlt={logoAlt} suggestionSource={suggestionSource} />
        </span>
      ) : null}

      <span className={styles.copy}>
        <span className={styles.title}>
          {autocompleteQuery !== undefined ? (
            <AutocompleteTitle title={accessibleTitle} query={autocompleteQuery} />
          ) : (
            <>
              {displayTitle}
              {displayEmphasizedTitle ? (
                <>
                  {" "}
                  <span className={styles.titleEmphasis}>{displayEmphasizedTitle}</span>
                </>
              ) : null}
            </>
          )}
        </span>
        {displaySubtitle ? (
          <span className={styles.subtitle}>{displaySubtitle}</span>
        ) : null}
      </span>

      {showRightControl ? (
        <span className={separateRightControl ? styles.controlSpace : styles.rightControl}>
          {separateRightControl ? null : trailingControl}
        </span>
      ) : null}
    </div>
  );

  if (separateRightControl && showRightControl) {
    return (
      <div className={rootClassName} style={style} data-variant={variant}>
        <div className={styles.actionRow}>
          {onClick ? (
            <button type="button" className={styles.rowAction} aria-label={ariaLabel ?? accessibleTitle} onClick={onClick} disabled={disabled}>
              {content}
            </button>
          ) : content}
          {onRightControlClick ? <button type="button" className={styles.trailingAction}
            aria-label={rightControlLabel ?? `More options for ${accessibleTitle}`} onClick={onRightControlClick}
            aria-haspopup={rightControlExpanded === undefined ? undefined : "menu"}
            aria-expanded={rightControlExpanded} aria-controls={rightControlMenuId}>
            {trailingControl}
          </button> : <span className={`${styles.trailingAction} ${styles.passiveControl}`} aria-hidden="true">{trailingControl}</span>}
        </div>
        {showDivider ? <Divider /> : null}
      </div>
    );
  }

  const inner = (
    <>
      {content}
      {showDivider ? <Divider /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={rootClassName}
        style={style}
        type="button"
        aria-label={ariaLabel ?? accessibleTitle}
        data-variant={variant}
        onClick={onClick}
        disabled={disabled}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={rootClassName} style={style} data-variant={variant}>
      {inner}
    </div>
  );
}
