import { Dismiss16Regular } from "@fluentui/react-icons";
import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./TabsCard.module.css";

const defaultPreview = new URL("./assets/open-ai-preview.png", import.meta.url).href;
const defaultFavicon = new URL("./assets/open-ai-favicon.png", import.meta.url).href;

export interface TabsCardProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "title" | "onSelect"> {
  title?: string;
  /** The host owns selection so only one card in a collection is selected. */
  selected?: boolean;
  /** Defaults to the source artwork; supplied previews fill the area below the header. */
  previewSrc?: string | null;
  /** Optional image-fill geometry supplied by a screen's Figma instance. */
  previewStyle?: CSSProperties;
  faviconSrc?: string | null;
  onSelect?: () => void;
  onClose?: () => void;
  /** Override these names when a collection contains duplicate page titles. */
  selectLabel?: string;
  closeLabel?: string;
}

/** Browser tab thumbnail from C2 Figma 878:30997, at its native 140 × 160 size. */
export function TabsCard({
  title = "Open ai",
  selected = false,
  previewSrc = defaultPreview,
  previewStyle,
  faviconSrc = defaultFavicon,
  onSelect,
  onClose,
  selectLabel = `Select tab: ${title}`,
  closeLabel = `Close tab: ${title}`,
  className,
  ...props
}: TabsCardProps) {
  return (
    <article
      {...props}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-state={selected ? "selected" : "rest"}
    >
      <button
        type="button"
        className={styles.select}
        aria-label={selectLabel}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {previewSrc && <img
          className={[styles.preview, previewSrc === defaultPreview && styles.designPreview].filter(Boolean).join(" ")}
          src={previewSrc} style={previewStyle} alt="" draggable={false}
        />}
        <span className={styles.header}>
          <span className={styles.identity}>
            {faviconSrc && <img className={styles.favicon} src={faviconSrc} alt="" draggable={false} />}
            <span className={styles.title} title={title}>{title}</span>
          </span>
          <span className={styles.closeSpace} aria-hidden="true" />
        </span>
      </button>
      <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
        <Dismiss16Regular aria-hidden="true" />
      </button>
    </article>
  );
}
