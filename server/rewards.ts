import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { normalizeRewardsAccount, parseRewardsSnapshot, REWARDS_PATH } from "../src/auth/rewards";

const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Local-only bridge for sanitized captures, not a proxy for authenticated Microsoft pages. */
export function createRewardsHandler(snapshotFile: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (new URL(req.url || "/", "http://localhost").pathname !== REWARDS_PATH) return next();
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      res.end(JSON.stringify(body));
    };
    try {
      const host = new URL(`http://${req.headers.host || ""}`);
      const origin = req.headers.origin ? new URL(req.headers.origin) : null;
      if (!loopback.has(req.socket.remoteAddress || "") || !localHosts.has(host.hostname)
        || origin && (!/^https?:$/.test(origin.protocol) || origin.host !== host.host)) return send(403, { error: "Local access only" });
    } catch { return send(403, { error: "Local access only" }); }
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(405, { error: "Method not allowed" }); }
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return send(415, { error: "JSON required" });
    let input: unknown;
    try {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 1024) return send(413, { error: "Request too large" });
      }
      input = JSON.parse(raw);
    } catch { return send(400, { error: "Invalid request" }); }
    const email = input && typeof input === "object" && "accountEmail" in input && typeof input.accountEmail === "string"
      ? normalizeRewardsAccount(input.accountEmail) : "";
    if (!email) return send(200, { snapshot: null });
    try {
      const source = await readFile(snapshotFile, "utf8");
      const snapshot = source.length < 8192 ? parseRewardsSnapshot(JSON.parse(source)) : null;
      return send(200, { snapshot: snapshot?.accountEmail === email ? snapshot : null });
    } catch { return send(200, { snapshot: null }); }
  };
}

export function rewardsPlugin(): Plugin {
  return {
    name: "local-microsoft-rewards",
    configureServer(server) { server.middlewares.use(createRewardsHandler(resolve(server.config.root, ".local/rewards.json"))); },
    configurePreviewServer(server) { server.middlewares.use(createRewardsHandler(resolve(server.config.root, ".local/rewards.json"))); },
  };
}
