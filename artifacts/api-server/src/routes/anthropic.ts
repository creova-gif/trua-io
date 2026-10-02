import { Router, type Request, type RequestHandler } from "express";
import { authMiddleware } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  drizzleConversationStore,
  type ConversationStore,
} from "../lib/conversation-store";
import { aiOrgRateLimit } from "../lib/org-rate-limit";

const router = Router();

type StreamHandlers = {
  onText: (text: string) => void;
  onFinal: () => void;
  onError: (err: unknown) => void;
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

export type StreamReply = (
  history: HistoryMessage[],
  handlers: StreamHandlers,
) => void;

const SYSTEM_PROMPT = `You are Trua, an AI sales assistant specialized in Tanzanian B2B outreach. 
You help sales teams craft personalized emails, qualify leads, analyze campaign performance, and provide strategic advice for the Tanzanian business market.
Be concise, practical, and culturally aware.`;

function defaultStreamReply(
  history: HistoryMessage[],
  handlers: StreamHandlers,
): void {
  const stream = anthropic.messages.stream({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  stream.on("text", handlers.onText);
  stream.on("finalMessage", () => {
    handlers.onFinal();
  });
  stream.on("error", handlers.onError);
}

function orgIdFrom(req: Request): number | undefined {
  const orgId = (req as any).orgId as unknown;
  if (typeof orgId !== "number" || !Number.isInteger(orgId)) return undefined;
  return orgId;
}

function parseId(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return id;
}

export function createAnthropicRouter(deps?: {
  store?: ConversationStore;
  auth?: RequestHandler[];
  streamReply?: StreamReply;
  rateLimit?: RequestHandler;
}): Router {
  const store = deps?.store ?? drizzleConversationStore;
  const auth = deps?.auth ?? authMiddleware;
  const streamReply = deps?.streamReply ?? defaultStreamReply;
  const rateLimit = deps?.rateLimit ?? aiOrgRateLimit;
  const routes = Router();

  routes.get(
    "/anthropic/conversations",
    ...auth,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const all = await store.list(orgId);
      res.json(all);
    },
  );

  routes.post(
    "/anthropic/conversations",
    ...auth,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { title } = req.body as { title?: unknown };
      if (typeof title !== "string" || title.length === 0) {
        res.status(400).json({ error: "title is required" });
        return;
      }
      const conv = await store.create(orgId, title);
      res.status(201).json(conv);
    },
  );

  routes.get(
    "/anthropic/conversations/:id",
    ...auth,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const id = parseId(req.params.id);
      const conv = id === undefined ? undefined : await store.get(orgId, id);
      if (!conv) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      res.json(conv);
    },
  );

  routes.delete(
    "/anthropic/conversations/:id",
    ...auth,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const id = parseId(req.params.id);
      const conv = id === undefined ? undefined : await store.delete(orgId, id);
      if (!conv) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      res.sendStatus(204);
    },
  );

  routes.get(
    "/anthropic/conversations/:id/messages",
    ...auth,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const id = parseId(req.params.id);
      const msgs =
        id === undefined ? undefined : await store.listMessages(orgId, id);
      if (!msgs) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      res.json(msgs);
    },
  );

  routes.post(
    "/anthropic/conversations/:id/messages",
    ...auth,
    rateLimit,
    async (req, res): Promise<void> => {
      const orgId = orgIdFrom(req);
      if (orgId === undefined) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const id = parseId(req.params.id);
      const { content } = req.body as { content?: unknown };

      if (typeof content !== "string" || content.length === 0) {
        res.status(400).json({ error: "content is required" });
        return;
      }

      if (id === undefined) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const opened = await store.addUserMessage(orgId, id, content);
      if (!opened) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullContent = "";
      const history: HistoryMessage[] = opened.history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      streamReply(history, {
        onText(text) {
          fullContent += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        },
        onFinal() {
          void store.addAssistantMessage(orgId, id, fullContent).then(
            () => {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              res.end();
            },
            (err) => {
              req.log.error({ err }, "Failed to store assistant message");
              if (!res.writableEnded) {
                res.write(
                  `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
                );
                res.end();
              }
            },
          );
        },
        onError(err) {
          req.log.error({ err }, "Anthropic stream error");
          res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
          res.end();
        },
      });
    },
  );

  return routes;
}

router.use(createAnthropicRouter());

export default router;
