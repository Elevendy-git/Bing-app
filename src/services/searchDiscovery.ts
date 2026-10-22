export const SEARCH_DISCOVERY_PATH = "/api/search-discovery";
export type DiscoverySection = "recommendations" | "trending";
export interface DiscoveryItem {
  id: string;
  title: string;
  /** Related article headline for readable trend display; title retains the original query. */
  headline?: string;
  imageSrc: string | null;
  url: string;
}
export interface DiscoveryPage {
  section: DiscoverySection;
  source: "msn" | "google-trends";
  fetchedAt: string;
  items: DiscoveryItem[];
}

export async function fetchSearchDiscovery(section: DiscoverySection, signal: AbortSignal): Promise<DiscoveryPage> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SEARCH_DISCOVERY_PATH.slice(1)}?section=${section}`, {
    signal, credentials: "omit", referrerPolicy: "no-referrer", headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Search discovery is unavailable");
  const data = await response.json() as DiscoveryPage;
  if (!data || data.section !== section || data.source !== (section === "recommendations" ? "msn" : "google-trends")
    || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.items)
    || data.items.length > (section === "recommendations" ? 3 : 6)
    || data.items.some(item => !item || !item.id || typeof item.title !== "string" || !item.title
      || (item.headline !== undefined && (typeof item.headline !== "string" || !item.headline))
      || typeof item.url !== "string" || (item.imageSrc !== null && typeof item.imageSrc !== "string"))) {
    throw new Error("Invalid search discovery data");
  }
  return data;
}
