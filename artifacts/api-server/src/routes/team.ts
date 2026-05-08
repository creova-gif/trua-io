import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { clerkClient } from "@clerk/express";

const router = Router();

router.get("/org/my-membership", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const clerkUserId = (req as any).clerkUserId as string;

  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.orgId, orgId), eq(membersTable.clerkUserId, clerkUserId)));

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json({ memberId: member.id, role: member.role, clerkUserId: member.clerkUserId });
});

router.get("/org/members", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.orgId, orgId))
    .orderBy(membersTable.createdAt);

  const enriched = await Promise.all(
    members.map(async (m) => {
      try {
        const user = await clerkClient.users.getUser(m.clerkUserId);
        return {
          id: m.id,
          orgId: m.orgId,
          clerkUserId: m.clerkUserId,
          role: m.role,
          createdAt: m.createdAt,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.emailAddresses[0]?.emailAddress ?? null,
          imageUrl: user.imageUrl,
        };
      } catch {
        return {
          id: m.id,
          orgId: m.orgId,
          clerkUserId: m.clerkUserId,
          role: m.role,
          createdAt: m.createdAt,
          firstName: null,
          lastName: null,
          email: null,
          imageUrl: null,
        };
      }
    })
  );

  res.json(enriched);
});

router.patch("/org/members/:memberId/role", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const role = (req as any).role as string;
  const memberId = parseInt(Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId, 10);
  const { role: newRole } = req.body;

  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can change roles" });
    return;
  }

  const validRoles = ["admin", "sales_user", "viewer"];
  if (!validRoles.includes(newRole)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(membersTable)
    .set({ role: newRole })
    .where(and(eq(membersTable.id, memberId), eq(membersTable.orgId, orgId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json({ id: updated.id, role: updated.role });
});

router.delete("/org/members/:memberId", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const role = (req as any).role as string;
  const currentUserId = (req as any).clerkUserId as string;
  const memberId = parseInt(Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId, 10);

  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can remove members" });
    return;
  }

  const [target] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.orgId, orgId)));

  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  if (target.clerkUserId === currentUserId) {
    res.status(400).json({ error: "Cannot remove yourself" });
    return;
  }

  await db
    .delete(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.orgId, orgId)));

  res.sendStatus(204);
});

export default router;
