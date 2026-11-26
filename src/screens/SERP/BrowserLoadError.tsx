import styles from "./LiveBingResults.module.css";

export interface BrowserLoadErrorProps {
  webPage?: boolean;
  onRetry?: () => void;
}

/** Shared error presentation; omitting Retry keeps design previews passive. */
export function BrowserLoadError({ webPage = false, onRetry }: BrowserLoadErrorProps) {
  return <div className={styles.message} role="alert">
    <p>{webPage ? "This page can’t be previewed" : "Couldn’t load results"}</p>
    {webPage && <p className={styles.explanation}>You can try again or go back to your results.</p>}
    <button type="button" disabled={!onRetry} onClick={onRetry}>Try again</button>
  </div>;
}
