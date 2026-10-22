import { useCallback, useState } from "react";
import { LiveBingResults, type BingLoadState } from "./LiveBingResults";
import { SERP, type SERPProps } from "./SERP";

type LiveSERPProps = Omit<SERPProps, "webContent" | "loadState" | "loadKey" | "animateLoading"> & { query: string };

/** Each navigation owns its progress, including same-query retries. */
export function LiveSERP(props: LiveSERPProps) {
  return <LiveSERPSession key={props.query} {...props} />;
}

function LiveSERPSession({ query, ...props }: LiveSERPProps) {
  const [load, setLoad] = useState<{ state: BingLoadState; attempt: number }>({ state: "loading", attempt: 0 });
  const onLoadStateChange = useCallback((state: BingLoadState, attempt: number) => setLoad({ state, attempt }), []);
  return <SERP {...props} query={query} loadState={load.state === "error" ? undefined : load.state}
    loadKey={load.attempt} animateLoading
    webContent={<LiveBingResults query={query} onLoadStateChange={onLoadStateChange} />} />;
}
