import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { webUrl, resultDestination } from "../src/services/webNavigation";
import { MOBILE_USER_AGENT } from "./http";

const blocked = new BlockList();
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(address, prefix);
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
const globalIPv6 = new BlockList(); globalIPv6.addSubnet("2000::", 3, "ipv6");
export function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4")
    : family === 6 && globalIPv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function publicWebUrl(value: string) {
  const valid = webUrl(value);
  if (!valid) throw new Error("Invalid URL");
  const url = new URL(valid);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (url.port || hostname === "localhost" || !hostname.includes(".") && !isIP(hostname)
    || /\.(localhost|local|internal|home|test|invalid)$/.test(hostname)
    || isIP(hostname) && !isPublicAddress(hostname)) throw new Error("Unavailable destination");
  return url;
}

export async function resolvePublicAddress(url: URL, resolve = lookup) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolve(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error("Unavailable destination");
  return addresses.find(item => item.family === 4) ?? addresses[0];
}

const MAX_BYTES = 4 * 1024 * 1024;
/** Resolve and pin every connection, including redirects, to prevent DNS rebinding. */
export async function fetchWebPage(value: string, signal: AbortSignal): Promise<{ source: string; sourceUrl: string }> {
  return fetchPublicDocument(value, signal, "html");
}

/** Fixed provider adapters share the same bounded, public-IP-pinned transport. */
export async function fetchPublicJson(value: string, signal: AbortSignal): Promise<unknown> {
  const { source } = await fetchPublicDocument(value, signal, "json");
  return JSON.parse(source) as unknown;
}

async function fetchPublicDocument(value: string, signal: AbortSignal, format: "html" | "json"): Promise<{ source: string; sourceUrl: string }> {
  let url = publicWebUrl(resultDestination(value) ?? value);
  for (let redirects = 0; redirects <= 5; redirects++) {
    signal.throwIfAborted();
    const address = await resolvePublicAddress(url);
    signal.throwIfAborted();
    const response = await new Promise<{ source?: string; redirect?: string }>((resolve, reject) => {
      const request = url.protocol === "https:" ? httpsRequest : httpRequest;
      const req = request(url, {
        signal, agent: false, family: address.family,
        lookup: (_hostname, _options, done) => done(null, address.address, address.family),
        headers: { "User-Agent": MOBILE_USER_AGENT,
          Accept: format === "json" ? "application/json" : "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9", "Accept-Encoding": "identity" },
      }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0) && res.headers.location) {
          res.destroy(); resolve({ redirect: res.headers.location }); return;
        }
        const contentType = format === "json" ? /^application\/json(?:;|$)/i : /^(text\/html|application\/xhtml\+xml)/i;
        if ((res.statusCode ?? 500) >= 400 || !contentType.test(res.headers["content-type"] ?? "")
          || res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") {
          res.destroy(); reject(new Error("Page cannot be previewed")); return;
        }
        const chunks: Buffer[] = []; let length = 0;
        res.on("data", (chunk: Buffer) => {
          length += chunk.length;
          if (length > MAX_BYTES) { res.destroy(new Error("Page too large")); return; }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ source: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
        res.on("aborted", () => reject(new Error("Page interrupted")));
      });
      req.on("error", reject); req.end();
    });
    if (response.source !== undefined) return { source: response.source, sourceUrl: url.href };
    url = publicWebUrl(new URL(response.redirect!, url).href);
  }
  throw new Error("Too many redirects");
}
