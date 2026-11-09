const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Public data endpoints use the deployed backend; local development keeps Vite's own API paths. */
export function resolvePublicApiUrl(path: string, apiBase = "", appBase = "/"): string {
  if (!/^\/api\//.test(path) || /^\/api\/rewards(?:[/?#]|$)/.test(path)) {
    throw new Error("Expected a public API path");
  }
  const base = apiBase.trim();
  if (!base) return `${appBase.endsWith("/") ? appBase : `${appBase}/`}${path.slice(1)}`;
  const url = new URL(base);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopbackHosts.has(url.hostname)))
    || url.username || url.password || url.search || url.hash) {
    throw new Error("VITE_API_BASE_URL must be an HTTPS backend URL, or a loopback HTTP URL");
  }
  return `${url.href.replace(/\/+$/, "")}${path}`;
}

// Read Vite configuration only when used in the browser. Server code also imports
// parsers/constants from these services, so this module has no browser side effects.
export function publicApiUrl(path: string): string {
  return resolvePublicApiUrl(path, import.meta.env.VITE_API_BASE_URL, import.meta.env.BASE_URL);
}
