import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { handleSearchSuggestions } from "./searchSuggestions";
import { createMsnFeedHandler } from "./msnFeed";
import { handleBingSerp } from "./bingSerp";
import { handleWebPage } from "./webPage";
import { sendJson as send } from "./http";

const DEFAULT_ORIGINS = ["https://elevendy-git.github.io", "http://localhost:5174", "http://127.0.0.1:5174"];
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_BUCKETS = 5000;
const MAX_REQUEST_URL_LENGTH = 16_384;
// Keep the socket open through the search adapter's 20-second provider budget.
const RESPONSE_IDLE_TIMEOUT_MS = 25_000;

export interface ProductionConfig {
  port: number;
  allowedOrigins: readonly string[];
  rateLimitRequests: number;
  maxConcurrent: number;
}

function positiveInteger(value: string | undefined, fallback: number, maximum: number, name: string) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return Number(value);
}

function allowedOrigin(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password
    || url.pathname !== "/" || url.search || url.hash) throw new Error("API_ALLOWED_ORIGINS must contain HTTP(S) origins without paths");
  return url.origin;
}

export function productionConfig(env: NodeJS.ProcessEnv = process.env): ProductionConfig {
  const origins = env.API_ALLOWED_ORIGINS === undefined ? DEFAULT_ORIGINS : env.API_ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
  if (!origins.length) throw new Error("API_ALLOWED_ORIGINS must contain at least one origin");
  return {
    port: positiveInteger(env.PORT, 3000, 65535, "PORT"),
    allowedOrigins: [...new Set(origins.map(allowedOrigin))],
    rateLimitRequests: positiveInteger(env.API_RATE_LIMIT_REQUESTS, 120, 1000, "API_RATE_LIMIT_REQUESTS"),
    maxConcurrent: positiveInteger(env.API_MAX_CONCURRENT, 8, 32, "API_MAX_CONCURRENT"),
  };
}

/** Anonymous, read-only API service. No static files, Rewards, account data or request logging. */
export function createProductionServer(config = productionConfig()) {
  const origins = new Set(config.allowedOrigins);
  const handlers = new Map([
    ["/api/search-suggestions", handleSearchSuggestions],
    ["/api/msn-feed", createMsnFeedHandler()],
    ["/api/bing-serp", handleBingSerp],
    ["/api/web-page", handleWebPage],
  ]);
  const buckets = new Map<string, { count: number; resetsAt: number }>();
  let concurrent = 0;

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Vary", "Origin");
    if ((req.url?.length ?? 0) > MAX_REQUEST_URL_LENGTH) return send(res, 414, { error: "Request URL is too long" });
    let url: URL;
    try { url = new URL(req.url ?? "/", "http://localhost"); }
    catch { return send(res, 400, { error: "Invalid request URL" }); }

    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (!origins.has(origin)) return send(res, 403, { error: "Origin is not allowed" });
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Expose-Headers", "Retry-After");
    }

    if (url.pathname === "/health") {
      if (req.method === "HEAD") { res.writeHead(200, { "Cache-Control": "no-store" }); return res.end(); }
      if (req.method !== "GET") { res.setHeader("Allow", "GET, HEAD"); return send(res, 405, { error: "Method not allowed" }); }
      return send(res, 200, { status: "ok" });
    }
    const handler = handlers.get(url.pathname);
    if (!handler) return send(res, 404, { error: "Not found" });

    if (req.method === "OPTIONS") {
      const headers = String(req.headers["access-control-request-headers"] ?? "").toLowerCase().split(",").map(header => header.trim()).filter(Boolean);
      if (!origin || req.headers["access-control-request-method"] !== "GET" || headers.some(header => header !== "accept")) {
        return send(res, 403, { error: "Preflight is not allowed" });
      }
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Accept",
        "Access-Control-Max-Age": "600", "Cache-Control": "no-store",
      });
      return res.end();
    }
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (req.headers["transfer-encoding"] || Number(req.headers["content-length"] ?? 0) > 0) {
      res.setHeader("Connection", "close");
      return send(res, 400, { error: "GET requests must not contain a body" });
    }

    const now = Date.now();
    // Expire anonymous counters and bound their memory. Never trust client-supplied forwarded IP headers.
    for (const [key, bucket] of buckets) if (bucket.resetsAt <= now) buckets.delete(key);
    const key = req.socket.remoteAddress ?? "unknown";
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= MAX_RATE_BUCKETS) { res.setHeader("Retry-After", "60"); return send(res, 503, { error: "API is busy" }); }
      bucket = { count: 0, resetsAt: now + RATE_WINDOW_MS };
      buckets.set(key, bucket);
    }
    if (++bucket.count > config.rateLimitRequests) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000))));
      return send(res, 429, { error: "Too many requests" });
    }
    if (concurrent >= config.maxConcurrent) {
      res.setHeader("Retry-After", "1");
      return send(res, 503, { error: "API is busy" });
    }
    concurrent++;
    try { await handler(req, res, () => send(res, 404, { error: "Not found" })); }
    catch { send(res, 500, { error: "API request failed" }); }
    // Shared MSN loads outlive a disconnected consumer. Keep the work cap until
    // its adapter settles, rather than freeing capacity when the socket closes.
    finally { concurrent--; }
  };

  const server = createServer({ maxHeaderSize: 32_768 }, (req, res) => {
    void handle(req, res).catch(() => send(res, 500, { error: "API request failed" }));
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  server.setTimeout(RESPONSE_IDLE_TIMEOUT_MS, socket => socket.destroy());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = productionConfig();
  const server = createProductionServer(config);
  server.listen(config.port, "0.0.0.0", () => {
    console.info(`Bing App public API listening on port ${config.port}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 10_000).unref();
  });
}
