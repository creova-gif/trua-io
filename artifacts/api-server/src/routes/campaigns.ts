import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/campaigns", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.orgId, orgId))
    .orderBy(campaignsTable.createdAt);

  res.json(campaigns);
});

router.post("/campaigns", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { name, description, language, subjectLine, bodyHtml, segmentFilter, scheduledAt } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      orgId,
      name,
      description,
      language: language ?? "en",
      subjectLine,
      bodyHtml,
      segmentFilter,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    })
    .returning();

  res.status(201).json(campaign);
});

router.get("/campaigns/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

router.patch("/campaigns/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const { name, description, status, language, subjectLine, bodyHtml, scheduledAt } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (language !== undefined) updates.language = language;
  if (subjectLine !== undefined) updates.subjectLine = subjectLine;
  if (bodyHtml !== undefined) updates.bodyHtml = bodyHtml;
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);

  const [campaign] = await db
    .update(campaignsTable)
    .set(updates)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

router.delete("/campaigns/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [campaign] = await db
    .delete(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/campaigns/:id/run", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status: "running" })
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

router.post("/campaigns/:id/pause", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status: "paused" })
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.orgId, orgId)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

export default router;
