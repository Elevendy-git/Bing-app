import { installIABFindBridge } from "./iabFindBridge";
export type { IABFindRequest, IABFindResult } from "./iabFindBridge";

/** Only web destinations can enter the preview; app/system URL schemes stay inert. */
export function webUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 4096 ? url.href : null;
  } catch { return null; }
}

/** Decode the two known Bing result wrappers; unknown redirects stay resolvable URLs. */
export function resultDestination(value: string): string | null {
  const valid = webUrl(value);
  if (!valid) return null;
  const url = new URL(valid);
  if (url.hostname === "www.bing.com" || url.hostname === "bing.com") {
    let payload: string | undefined;
    if (url.pathname === "/ck/a") {
      const encoded = url.searchParams.get("u");
      if (encoded?.startsWith("a1")) payload = encoded.slice(2);
    } else if (url.protocol === "https:" && url.pathname === "/fd/ls/GLinkPing.aspx") {
      const encoded = url.searchParams.getAll("redir");
      if (encoded.length === 1 && /^[A-Za-z0-9_-]+={0,2}$/.test(encoded[0])) payload = encoded[0];
    }
    try {
      if (payload === undefined) return valid;
      const bytes = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return webUrl(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes, c => c.charCodeAt(0)))) ?? valid;
    } catch { /* An invalid wrapper can still be resolved by the existing server path. */ }
  }
  return valid;
}

/** The only executable code in a preview. Remote scripts remain removed and CSP-blocked. */
export function withIABNavigation(html: string, channel: string, parentOrigin: string) {
  const policy = `default-src 'none'; img-src https: http: data:; style-src https: http: 'unsafe-inline'; font-src https: http: data:; script-src 'nonce-${channel}'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const bridge = `<script nonce="${channel}">(() => {
    const open = event => {
      const a = event.target instanceof Element ? event.target.closest('a') : null;
      if (!a) return;
      const url = a.getAttribute('data-iab-href') || a.getAttribute('href');
      if (!url || url.startsWith('#')) return;
      event.preventDefault();
      if (event.type === 'auxclick' && event.button !== 1) return;
      parent.postMessage({ type: 'bing-iab-navigate', channel: ${JSON.stringify(channel)}, url }, ${JSON.stringify(parentOrigin)});
    };
    document.addEventListener('click', open, true);
    document.addEventListener('auxclick', open, true);
    (${installIABFindBridge.toString()})(window, document, ${JSON.stringify(channel)}, ${JSON.stringify(parentOrigin)});
  })();</script>`;
  const document = html.replace(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, "");
  // This policy must precede the document, including when a test supplies only a fragment.
  return `<meta http-equiv="Content-Security-Policy" content="${policy}">${document}${bridge}`;
}
