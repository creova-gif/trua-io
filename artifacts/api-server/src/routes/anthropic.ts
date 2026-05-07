import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/anthropic/conversations", ...authMiddleware, async (_req, res): Promise<void> => {
  const all = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(all);
});

router.post("/anthropic/conversations", ...authMiddleware, async (req, res): Promise<void> => {
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(conv);
});

router.get("/anthropic/conversations/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/anthropic/conversations/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [conv] = await db.delete(conversations).where(eq(conversations.id, id)).returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/anthropic/conversations/:id/messages", ...authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/anthropic/conversations/:id/messages", ...authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = anthropic.messages.stream({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    system: `You are Trua, an AI sales assistant specialized in Tanzanian B2B outreach. 
You help sales teams craft personalized emails, qualify leads, analyze campaign performance, and provide strategic advice for the Tanzanian business market.
Be concise, practical, and culturally aware.`,
    messages: history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  let fullContent = "";

  stream.on("text", (text) => {
    fullContent += text;
    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
  });

  stream.on("finalMessage", async () => {
    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullContent });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  });

  stream.on("error", (err) => {
    req.log.error({ err }, "Anthropic stream error");
    res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
    res.end();
  });
});

export default router;
