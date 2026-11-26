import { SERP } from "./SERP";
import { BrowserLoadError } from "./BrowserLoadError";
import type { FindOnPageState } from "./FindOnPage";
import styles from "./SERP.examples.module.css";

export type SERPKeyScreenState = "serp-loading" | "serp-menu" | "serp-private" | "serp-error"
  | "webpage" | "webpage-bookmarked" | "webpage-loading" | "webpage-menu" | "webpage-private" | "webpage-error" | "find";

const WEBPAGE_URL = "https://openai.com/";
const WEBPAGE_REFERENCE = new URL("../../components/TabsCard/assets/open-ai-preview.png", import.meta.url).href;
const noAction = () => undefined;
const FIND_PREVIEW: FindOnPageState = {
  query: "", total: 0, index: -1,
  onQueryChange: noAction, onPrevious: noAction, onNext: noAction, onDismiss: noAction,
};

/** Fixed Key screens reuse App chrome without live requests or browser actions. */
export function SERPKeyScreen({ state }: { state: SERPKeyScreenState }) {
  const webPage = state.startsWith("webpage") || state === "find";
  const loading = state.endsWith("loading");
  const content = state.endsWith("error") ? <BrowserLoadError webPage={webPage} />
    : loading ? <></>
    : webPage ? <img className={styles.webpageReference} src={WEBPAGE_REFERENCE}
      alt="OpenAI webpage — existing design reference" draggable={false} /> : undefined;

  return <SERP query={webPage ? WEBPAGE_URL : "Weather"} webPage={webPage}
    pageUrl={webPage ? WEBPAGE_URL : undefined} pageTitle={webPage ? "OpenAI" : undefined}
    privateMode={state.endsWith("private")} bookmarked={state === "webpage-bookmarked"}
    initialMenuOpen={state.endsWith("menu")} loadState={loading ? "loading" : undefined}
    animateLoading={false} webContent={content} find={state === "find" ? FIND_PREVIEW : undefined} />;
}
