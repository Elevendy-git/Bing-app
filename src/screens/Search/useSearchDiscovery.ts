import { useEffect, useState } from "react";
import { fetchSearchDiscovery, type DiscoveryPage, type DiscoverySection } from "../../services/searchDiscovery";

export interface DiscoveryResource {
  status: "loading" | "ready" | "error";
  page: DiscoveryPage | null;
  retry: () => void;
}
export interface SearchDiscovery {
  recommendations: DiscoveryResource;
  trending: DiscoveryResource;
}

function useDiscoverySection(section: DiscoverySection, enabled: boolean): DiscoveryResource {
  const [state, setState] = useState<Omit<DiscoveryResource, "retry">>({ status: "loading", page: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setState(current => ({ ...current, status: "loading" }));
    void fetchSearchDiscovery(section, controller.signal).then(page => {
      if (active && !controller.signal.aborted) setState({ status: "ready", page });
    }).catch(() => {
      if (active) setState(current => ({ ...current, status: "error" }));
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [section, enabled, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

/** Prefetch anonymous discovery in Prototype; changing pages preserves the same public snapshot. */
export function useSearchDiscovery(enabled: boolean): SearchDiscovery {
  const recommendations = useDiscoverySection("recommendations", enabled);
  const trending = useDiscoverySection("trending", enabled);
  return { recommendations, trending };
}
