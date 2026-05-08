import { Router } from "express";
import { db } from "@workspace/db";
import { complianceProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/compliance/progress", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const rows = await db
    .select()
    .from(complianceProgressTable)
    .where(eq(complianceProgressTable.orgId, orgId));
  res.json(rows);
});

router.post("/compliance/progress/:itemId", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const itemId = String(req.params.itemId);
  const { notes } = req.body ?? {};

  const existing = await db
    .select()
    .from(complianceProgressTable)
    .where(and(eq(complianceProgressTable.orgId, orgId), eq(complianceProgressTable.itemId, itemId)));

  if (existing.length) {
    await db
      .delete(complianceProgressTable)
      .where(and(eq(complianceProgressTable.orgId, orgId), eq(complianceProgressTable.itemId, itemId)));
    res.json({ checked: false });
    return;
  }

  await db.insert(complianceProgressTable).values({ orgId, itemId, notes: notes ?? null });
  res.json({ checked: true });
});

router.patch("/compliance/progress/:itemId/notes", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const itemId = String(req.params.itemId);
  const { notes } = req.body;

  await db
    .update(complianceProgressTable)
    .set({ notes })
    .where(and(eq(complianceProgressTable.orgId, orgId), eq(complianceProgressTable.itemId, itemId)));

  res.json({ ok: true });
});

export default router;
