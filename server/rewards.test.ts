// @vitest-environment node
import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRewardsHandler } from "./rewards";

const snapshot = {
  accountEmail: "owner@example.com", availablePoints: 731, readyToClaim: 30, dailyStreakDays: 0,
  observedAt: "2026-01-01T10:00:00Z", source: "microsoft-rewards-dashboard",
};
let server: Server, origin: string, directory: string, file: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "bing-rewards-test-"));
  file = join(directory, "rewards.json");
  await writeFile(file, JSON.stringify(snapshot));
  const handler = createRewardsHandler(file);
  server = createServer((req, res) => { void handler(req, res, () => { res.writeHead(404); res.end(); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});
const call = (accountEmail = snapshot.accountEmail, originHeader = origin) => fetch(`${origin}/api/rewards`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: originHeader }, body: JSON.stringify({ accountEmail }),
});

describe("Local Rewards capture bridge", () => {
  it("returns only validated data for the matching account without caching private balances", async () => {
    await writeFile(file, JSON.stringify({ ...snapshot, accessToken: "not-for-the-client", rawPage: "private page text" }));
    const response = await call(" OWNER@EXAMPLE.COM ");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ snapshot: { ...snapshot, observedAt: "2026-01-01T10:00:00.000Z" } });
  });

  it("never returns another account's capture or a signed-out user's balance", async () => {
    for (const email of ["other@example.com", ""]) expect(await (await call(email)).json()).toEqual({ snapshot: null });
  });

  it("rejects external web origins, read-by-URL requests and invalid bodies", async () => {
    expect((await call(snapshot.accountEmail, "https://external.example")).status).toBe(403);
    expect((await fetch(`${origin}/api/rewards`)).status).toBe(405);
    expect((await fetch(`${origin}/api/rewards`, { method: "POST", body: "not-json" })).status).toBe(415);
    expect((await fetch(`${origin}/api/rewards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status).toBe(400);
  });

  it("treats missing or invalid captures as unavailable rather than generating points", async () => {
    for (const data of ["{}", JSON.stringify({ ...snapshot, availablePoints: -1 }), "not-json"]) {
      await writeFile(file, data);
      expect(await (await call()).json()).toEqual({ snapshot: null });
    }
    await rm(file);
    expect(await (await call()).json()).toEqual({ snapshot: null });
  });
});
