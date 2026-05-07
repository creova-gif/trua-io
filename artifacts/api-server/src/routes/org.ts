import { Router } from "express";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/org/me", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json(org);
});

router.patch("/org/me", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { name, fromName, fromEmail, domain, locale, dailySendLimit } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (fromName !== undefined) updates.fromName = fromName;
  if (fromEmail !== undefined) updates.fromEmail = fromEmail;
  if (domain !== undefined) updates.domain = domain;
  if (locale !== undefined) updates.locale = locale;
  if (dailySendLimit !== undefined) updates.dailySendLimit = dailySendLimit;

  const [org] = await db
    .update(organizationsTable)
    .set(updates)
    .where(eq(organizationsTable.id, orgId))
    .returning();

  res.json(org);
});

export default router;
