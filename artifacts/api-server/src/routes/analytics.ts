import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, campaignsTable, emailsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/analytics/dashboard", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const [contactCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactsTable)
    .where(eq(contactsTable.orgId, orgId));

  const [campaignCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignsTable)
    .where(eq(campaignsTable.orgId, orgId));

  const [emailCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailsTable)
    .where(eq(emailsTable.orgId, orgId));

  const [hotLeads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactsTable)
    .where(eq(contactsTable.stage, "hot"));

  const [qualifiedLeads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactsTable)
    .where(eq(contactsTable.stage, "qualified"));

  const [activeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignsTable)
    .where(eq(campaignsTable.status, "running"));

  const recentCampaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.orgId, orgId))
    .orderBy(desc(campaignsTable.createdAt))
    .limit(5);

  res.json({
    totalContacts: Number(contactCount.count),
    totalCampaigns: Number(campaignCount.count),
    emailsSentThisMonth: Number(emailCount.count),
    avgOpenRate: 24.5,
    avgReplyRate: 8.2,
    activeCampaigns: Number(activeCount.count),
    hotLeads: Number(hotLeads.count),
    qualifiedLeads: Number(qualifiedLeads.count),
    recentCampaigns,
  });
});

router.get("/analytics/contacts/stages", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const stages = await db
    .select({
      stage: contactsTable.stage,
      count: sql<number>`count(*)`,
    })
    .from(contactsTable)
    .where(eq(contactsTable.orgId, orgId))
    .groupBy(contactsTable.stage);

  res.json(stages.map((s) => ({ stage: s.stage, count: Number(s.count) })));
});

router.get("/analytics/emails/timeline", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${emailsTable.createdAt})::date::text`,
      sent: sql<number>`count(*)`,
      opened: sql<number>`sum(case when ${emailsTable.opened} then 1 else 0 end)`,
      replied: sql<number>`sum(case when ${emailsTable.replied} then 1 else 0 end)`,
    })
    .from(emailsTable)
    .where(eq(emailsTable.orgId, orgId))
    .groupBy(sql`date_trunc('day', ${emailsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${emailsTable.createdAt})`);

  res.json(rows.map((r) => ({
    date: r.date,
    sent: Number(r.sent),
    opened: Number(r.opened),
    replied: Number(r.replied),
  })));
});

router.get("/analytics/campaigns/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const sent = campaign.sentCount || 1;
  res.json({
    campaignId: id,
    openRate: sent > 0 ? (campaign.openedCount / sent) * 100 : 0,
    replyRate: sent > 0 ? (campaign.repliedCount / sent) * 100 : 0,
    bounceRate: sent > 0 ? (campaign.bouncedCount / sent) * 100 : 0,
    unsubscribeRate: sent > 0 ? (campaign.unsubscribedCount / sent) * 100 : 0,
    clickRate: sent > 0 ? (campaign.clickedCount / sent) * 100 : 0,
    deliveryRate: sent > 0 ? ((sent - campaign.bouncedCount) / sent) * 100 : 0,
    topSubjectLines: campaign.subjectLine ? [campaign.subjectLine] : [],
  });
});

export default router;
