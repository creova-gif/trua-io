import { Router } from "express";
import { db } from "@workspace/db";
import { emailTemplatesTable } from "@workspace/db";
import { eq, or, isNull } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/templates", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const templates = await db
    .select()
    .from(emailTemplatesTable)
    .where(or(eq(emailTemplatesTable.orgId, orgId), isNull(emailTemplatesTable.orgId)))
    .orderBy(emailTemplatesTable.createdAt);

  res.json(templates);
});

router.post("/templates", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { name, industry, tone, language, subjectLine, bodyHtml } = req.body;

  if (!name || !subjectLine || !bodyHtml) {
    res.status(400).json({ error: "name, subjectLine, and bodyHtml are required" });
    return;
  }

  const [template] = await db
    .insert(emailTemplatesTable)
    .values({
      orgId,
      name,
      industry: industry ?? "general",
      tone: tone ?? "professional",
      language: language ?? "en",
      subjectLine,
      bodyHtml,
      isDefault: false,
    })
    .returning();

  res.status(201).json(template);
});

router.delete("/templates/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  await db
    .delete(emailTemplatesTable)
    .where(eq(emailTemplatesTable.id, id));

  res.sendStatus(204);
});

export default router;
