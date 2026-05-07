import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, contactsTable, organizationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/emails", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { page = "1", limit = "25" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const emails = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.orgId, orgId))
    .limit(limitNum)
    .offset(offset)
    .orderBy(emailsTable.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailsTable)
    .where(eq(emailsTable.orgId, orgId));

  res.json({ emails, total: Number(count), page: pageNum, limit: limitNum });
});

router.post("/emails/draft", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { contactId, language = "en", tone = "professional" } = req.body as {
    contactId: number;
    language?: string;
    tone?: string;
    templateId?: number;
  };

  if (!contactId) {
    res.status(400).json({ error: "contactId is required" });
    return;
  }

  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.orgId, orgId)));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  const langMap: Record<string, string> = { en: "English", sw: "Swahili" };
  const langName = langMap[language] ?? "English";

  const prompt = `You are an expert B2B email copywriter specializing in Tanzanian business outreach. Write a personalized, ${tone} cold outreach email in ${langName}.

Contact details:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Title: ${contact.jobTitle ?? "Decision Maker"}
- Company: ${contact.companyName ?? "their company"}
- Industry: ${contact.industry ?? "business"}
- City: ${contact.city ?? "Tanzania"}

Sender: ${org?.fromName ?? "Trua IO"} team

Requirements:
- Subject line: compelling and specific, max 60 chars
- Body: 3-4 short paragraphs, conversational yet professional
- Highlight value proposition relevant to their industry
- Clear, single CTA
- PDPA 2022 compliant — include unsubscribe notice
- If Swahili, use formal business Swahili

Return ONLY this JSON (no markdown):
{
  "subjectLine": "...",
  "bodyHtml": "<p>...</p>...",
  "bodyText": "...",
  "language": "${language}"
}`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const draft = JSON.parse(jsonMatch[0]);
  res.json(draft);
});

router.post("/emails/send", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { contactId, subject, bodyHtml, bodyText, campaignId } = req.body;

  if (!contactId || !subject || !bodyHtml) {
    res.status(400).json({ error: "contactId, subject, and bodyHtml are required" });
    return;
  }

  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.orgId, orgId)));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  const fromEmail = org?.fromEmail ?? "outreach@truaio.com";
  const fromName = org?.fromName ?? "Trua IO";

  const [email] = await db
    .insert(emailsTable)
    .values({
      orgId,
      campaignId: campaignId ?? null,
      contactId,
      subject,
      bodyHtml,
      bodyText,
      toEmail: contact.email,
      fromEmail,
      fromName,
      status: "sent",
      aiGenerated: true,
      sentAt: new Date(),
    })
    .returning();

  await db
    .update(contactsTable)
    .set({ lastContacted: new Date() })
    .where(eq(contactsTable.id, contactId));

  res.status(201).json(email);
});

router.get("/emails/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [email] = await db
    .select()
    .from(emailsTable)
    .where(and(eq(emailsTable.id, id), eq(emailsTable.orgId, orgId)));

  if (!email) {
    res.status(404).json({ error: "Email not found" });
    return;
  }

  res.json(email);
});

export default router;
