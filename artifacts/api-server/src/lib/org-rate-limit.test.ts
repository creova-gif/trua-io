import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express from "express";
import { createOrgRateLimit } from "./org-rate-limit";

async function listen(
  app: express.Express,
): Promise<{ server: Server; base: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

describe("per-org AI rate limit", () => {
  it("returns 429 after the org exceeds its window and does not block another org", async () => {
    const limit = createOrgRateLimit({
      name: "ai-test",
      windowMs: 60_000,
      max: 2,
    });
    const app = express();
    app.use((req, _res, next) => {
      const orgId = Number(req.header("x-test-org"));
      if (Number.isInteger(orgId)) (req as any).orgId = orgId;
      next();
    });
    app.use(limit);
    app.post("/ai", (_req, res) => {
      res.status(204).end();
    });

    const { server, base } = await listen(app);
    try {
      const hit = (org: number) =>
        fetch(`${base}/ai`, {
          method: "POST",
          headers: { "x-test-org": String(org) },
        });

      const first = await hit(1);
      assert.equal(first.status, 204);
      await first.arrayBuffer();
      const second = await hit(1);
      assert.equal(second.status, 204);
      await second.arrayBuffer();
      const blocked = await hit(1);
      assert.equal(blocked.status, 429);
      const body = (await blocked.json()) as { error: string };
      assert.equal(body.error, "Too many requests");
      assert.ok(blocked.headers.get("retry-after"));

      const other = await hit(2);
      assert.equal(other.status, 204);
      await other.arrayBuffer();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it("returns 401 when the request has no org", async () => {
    const limit = createOrgRateLimit({
      name: "ai-test-anon",
      windowMs: 60_000,
      max: 2,
    });
    const app = express();
    app.use(limit);
    app.post("/ai", (_req, res) => {
      res.status(204).end();
    });

    const { server, base } = await listen(app);
    try {
      const res = await fetch(`${base}/ai`, { method: "POST" });
      assert.equal(res.status, 401);
      await res.arrayBuffer();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
