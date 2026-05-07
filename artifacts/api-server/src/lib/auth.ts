import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { organizationsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
}

export async function resolveOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clerkUserId = (req as any).clerkUserId as string;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const member = await db
    .select({ orgId: membersTable.orgId, role: membersTable.role })
    .from(membersTable)
    .where(eq(membersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (member.length === 0) {
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        name: "My Organization",
        slug: `org-${clerkUserId.slice(-8)}`,
        fromName: "Trua IO",
      })
      .returning();

    await db.insert(membersTable).values({
      orgId: newOrg.id,
      clerkUserId,
      role: "admin",
    });

    (req as any).orgId = newOrg.id;
    (req as any).role = "admin";
  } else {
    (req as any).orgId = member[0].orgId;
    (req as any).role = member[0].role;
  }

  next();
}

export const authMiddleware = [requireAuth, resolveOrg];
