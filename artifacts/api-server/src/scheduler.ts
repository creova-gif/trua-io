import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { logger } from "./lib/logger";

async function runSchedulerTick(): Promise<void> {
  try {
    const now = new Date();
    const scheduled = await db
      .select({ id: campaignsTable.id, name: campaignsTable.name, orgId: campaignsTable.orgId })
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.status, "draft"),
          isNotNull(campaignsTable.scheduledAt),
          lte(campaignsTable.scheduledAt, now)
        )
      );

    for (const campaign of scheduled) {
      await db
        .update(campaignsTable)
        .set({ status: "running" })
        .where(eq(campaignsTable.id, campaign.id));

      logger.info(
        { campaignId: campaign.id, orgId: campaign.orgId, name: campaign.name },
        "Campaign auto-started by scheduler"
      );
    }
  } catch (err) {
    logger.error({ err }, "Scheduler tick failed");
  }
}

export function startScheduler(): void {
  runSchedulerTick();
  setInterval(runSchedulerTick, 60_000);
  logger.info("Campaign scheduler started (60s interval)");
}
