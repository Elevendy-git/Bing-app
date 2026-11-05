/** Only web destinations can enter the preview; app/system URL schemes stay inert. */
export function webUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 4096 ? url.href : null;
  } catch { return null; }
}

/** Bing result links commonly encode their real destination in a /ck/a redirect. */
export function resultDestination(value: string): string | null {
  const valid = webUrl(value);
  if (!valid) return null;
  const url = new URL(valid);
  if ((url.hostname === "www.bing.com" || url.hostname === "bing.com") && url.pathname === "/ck/a") {
    const encoded = url.searchParams.get("u");
    if (encoded?.startsWith("a1")) {
      try {
        const bytes = atob(encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/"));
        return webUrl(new TextDecoder().decode(Uint8Array.from(bytes, c => c.charCodeAt(0)))) ?? valid;
      } catch { /* A nonstandard redirect can still be resolved by the server. */ }
    }
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
  })();</script>`;
  const document = html.replace(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, "");
  // This policy must precede the document, including when a test supplies only a fragment.
  return `<meta http-equiv="Content-Security-Policy" content="${policy}">${document}${bridge}`;
}
