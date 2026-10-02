import "../test-env.ts";

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, beforeEach, describe, it } from "node:test";
import express, { type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { AI_ORG_RATE_LIMIT, aiOrgRateLimit } from "../lib/org-rate-limit";
import {
  conversationQueries,
  type ConversationStore,
} from "../lib/conversation-store";
import { createAnthropicRouter, type StreamReply } from "./anthropic";

type Conv = {
  id: number;
  orgId: number;
  title: string;
  createdAt: Date;
};

type Msg = {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
};

const headerAuth: RequestHandler = (req, res, next) => {
  const orgId = Number(req.header("x-test-org"));
  if (!Number.isInteger(orgId) || orgId <= 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).orgId = orgId;
  next();
};

function memoryStore(seed: { conversations: Conv[]; messages: Msg[] }) {
  const conversations = seed.conversations.map((row) => ({ ...row }));
  const messages = seed.messages.map((row) => ({ ...row }));
  let nextConvId = Math.max(0, ...conversations.map((row) => row.id)) + 1;
  let nextMsgId = Math.max(0, ...messages.map((row) => row.id)) + 1;

  const store: ConversationStore = {
    async list(orgId) {
      return conversations
        .filter((row) => row.orgId === orgId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    async create(orgId, title) {
      const row = { id: nextConvId++, orgId, title, createdAt: new Date() };
      conversations.push(row);
      return row;
    },
    async get(orgId, id) {
      const conv = conversations.find(
        (row) => row.id === id && row.orgId === orgId,
      );
      if (!conv) return undefined;
      return {
        ...conv,
        messages: messages.filter((row) => row.conversationId === id),
      };
    },
    async delete(orgId, id) {
      const index = conversations.findIndex(
        (row) => row.id === id && row.orgId === orgId,
      );
      if (index < 0) return undefined;
      const [removed] = conversations.splice(index, 1);
      return removed;
    },
    async listMessages(orgId, conversationId) {
      const conv = conversations.find(
        (row) => row.id === conversationId && row.orgId === orgId,
      );
      if (!conv) return undefined;
      return messages.filter((row) => row.conversationId === conversationId);
    },
    async addUserMessage(orgId, conversationId, content) {
      const conv = conversations.find(
        (row) => row.id === conversationId && row.orgId === orgId,
      );
      if (!conv) return undefined;
      messages.push({
        id: nextMsgId++,
        conversationId,
        role: "user",
        content,
        createdAt: new Date(),
      });
      return {
        conversation: conv,
        history: messages.filter(
          (row) => row.conversationId === conversationId,
        ),
      };
    },
    async addAssistantMessage(orgId, conversationId, content) {
      const conv = conversations.find(
        (row) => row.id === conversationId && row.orgId === orgId,
      );
      if (!conv) return;
      messages.push({
        id: nextMsgId++,
        conversationId,
        role: "assistant",
        content,
        createdAt: new Date(),
      });
    },
  };

  return {
    store,
    snapshot: () => ({
      conversations: conversations.map((row) => ({ ...row })),
      messages: messages.map((row) => ({ ...row })),
    }),
  };
}

function sqlOf(query: { toSQL: () => { sql: string; params: unknown[] } }) {
  return query.toSQL();
}

function whereClause(sql: string): string {
  const afterWhere = sql.split(/where/i)[1];
  assert.ok(afterWhere);
  return afterWhere.split(/\b(returning|order by)\b/i)[0] ?? "";
}

async function withApi(
  store: ConversationStore,
  streamReply: StreamReply,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAnthropicRouter({
      store,
      auth: [headerAuth],
      streamReply,
    }),
  );
  const server: Server = createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

describe("conversation org isolation", { concurrency: false }, () => {
  beforeEach(() => {
    aiOrgRateLimit.reset();
  });

  after(async () => {
    await pool.end();
  });

  it("builds production queries with the session org", () => {
    const list = sqlOf(conversationQueries.list(7));
    assert.match(whereClause(list.sql), /org_id/);
    assert.equal(list.params[0], 7);

    const find = sqlOf(conversationQueries.find(4, 7));
    assert.match(whereClause(find.sql), /"conversations"\."id"/);
    assert.match(whereClause(find.sql), /org_id/);
    assert.ok(find.params.includes(4));
    assert.ok(find.params.includes(7));

    const remove = sqlOf(conversationQueries.remove(4, 7));
    assert.match(remove.sql, /delete/i);
    assert.match(whereClause(remove.sql), /org_id/);
    assert.ok(remove.params.includes(4));
    assert.ok(remove.params.includes(7));

    const owned = sqlOf(conversationQueries.ownedId(4, 7));
    assert.match(whereClause(owned.sql), /org_id/);
    assert.ok(owned.params.includes(7));

    const created = sqlOf(conversationQueries.insertConversation(7, "hello"));
    assert.match(created.sql, /org_id/);
    assert.ok(created.params.includes(7));
  });

  it("returns 404 for another org's chats and does not delete them", async () => {
    const now = new Date("2026-10-02T00:00:00.000Z");
    const memory = memoryStore({
      conversations: [
        { id: 11, orgId: 1, title: "org-one", createdAt: now },
        { id: 22, orgId: 2, title: "org-two", createdAt: now },
      ],
      messages: [
        {
          id: 101,
          conversationId: 11,
          role: "user",
          content: "secret-one",
          createdAt: now,
        },
        {
          id: 202,
          conversationId: 22,
          role: "user",
          content: "secret-two",
          createdAt: now,
        },
      ],
    });
    let streamCalls = 0;
    const streamReply: StreamReply = () => {
      streamCalls += 1;
      throw new Error(
        "model must not be called for a conversation this org does not own",
      );
    };

    await withApi(memory.store, streamReply, async (base) => {
      const as = (org: number, path: string, init?: RequestInit) =>
        fetch(`${base}${path}`, {
          ...init,
          headers: {
            "content-type": "application/json",
            "x-test-org": String(org),
            ...(init?.headers ?? {}),
          },
        });

      const list = await as(1, "/api/anthropic/conversations");
      assert.equal(list.status, 200);
      const listed = (await list.json()) as { id: number }[];
      assert.deepEqual(
        listed.map((row) => row.id),
        [11],
      );

      const foreign = await as(1, "/api/anthropic/conversations/22");
      assert.equal(foreign.status, 404);
      assert.equal((await foreign.text()).includes("secret-two"), false);

      const foreignMessages = await as(
        1,
        "/api/anthropic/conversations/22/messages",
      );
      assert.equal(foreignMessages.status, 404);
      assert.equal(
        (await foreignMessages.text()).includes("secret-two"),
        false,
      );

      const foreignDelete = await as(1, "/api/anthropic/conversations/22", {
        method: "DELETE",
      });
      assert.equal(foreignDelete.status, 404);
      await foreignDelete.arrayBuffer();

      const foreignSend = await as(
        1,
        "/api/anthropic/conversations/22/messages",
        {
          method: "POST",
          body: JSON.stringify({ content: "steal", orgId: 2 }),
        },
      );
      assert.equal(foreignSend.status, 404);
      await foreignSend.arrayBuffer();
      assert.equal(streamCalls, 0);

      const own = await as(1, "/api/anthropic/conversations/11");
      assert.equal(own.status, 200);
      assert.equal((await own.text()).includes("secret-one"), true);

      const created = await as(1, "/api/anthropic/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "fresh", orgId: 2 }),
      });
      assert.equal(created.status, 201);
      const createdBody = (await created.json()) as {
        orgId: number;
        title: string;
      };
      assert.equal(createdBody.orgId, 1);
      assert.equal(createdBody.title, "fresh");

      const otherList = await as(2, "/api/anthropic/conversations");
      const otherIds = (
        (await otherList.json()) as { id: number; title: string }[]
      ).map((row) => row.title);
      assert.deepEqual(otherIds, ["org-two"]);

      const stillThere = await as(2, "/api/anthropic/conversations/22");
      assert.equal(stillThere.status, 200);
      assert.equal((await stillThere.text()).includes("secret-two"), true);
    });

    assert.equal(streamCalls, 0);
    assert.equal(
      memory
        .snapshot()
        .conversations.some((row) => row.id === 22 && row.orgId === 2),
      true,
    );
    assert.equal(
      memory.snapshot().messages.some((row) => row.content === "secret-two"),
      true,
    );
    assert.equal(
      memory.snapshot().messages.some((row) => row.content === "steal"),
      false,
    );
  });

  it("returns 401 when no org is on the request instead of listing every chat", async () => {
    const memory = memoryStore({
      conversations: [
        { id: 11, orgId: 1, title: "org-one", createdAt: new Date() },
      ],
      messages: [],
    });
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAnthropicRouter({
        store: memory.store,
        auth: [(_req, _res, next) => next()],
        streamReply: () => {
          throw new Error("model must not be called");
        },
      }),
    );
    const server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/anthropic/conversations`,
      );
      assert.equal(res.status, 401);
      assert.equal((await res.text()).includes("org-one"), false);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it("rate limits model calls per org", async () => {
    const memory = memoryStore({
      conversations: [
        { id: 11, orgId: 1, title: "org-one", createdAt: new Date() },
      ],
      messages: [],
    });
    let streamCalls = 0;
    const streamReply: StreamReply = (_history, handlers) => {
      streamCalls += 1;
      handlers.onText("ok");
      handlers.onFinal();
    };
    await withApi(memory.store, streamReply, async (base) => {
      const send = async (org: number) => {
        const res = await fetch(
          `${base}/api/anthropic/conversations/11/messages`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-test-org": String(org),
            },
            body: JSON.stringify({ content: "hello" }),
          },
        );
        await res.arrayBuffer();
        return res;
      };

      for (let i = 0; i < AI_ORG_RATE_LIMIT.max; i += 1) {
        assert.equal((await send(2)).status, 404);
      }
      assert.equal((await send(2)).status, 429);
      assert.equal((await send(1)).status, 200);
      assert.equal(streamCalls, 1);
    });
  });
});
