import { pgTable, text, serial, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  language: text("language").notNull().default("en"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  subjectLine: text("subject_line"),
  bodyHtml: text("body_html"),
  segmentFilter: json("segment_filter"),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  repliedCount: integer("replied_count").notNull().default(0),
  bouncedCount: integer("bounced_count").notNull().default(0),
  unsubscribedCount: integer("unsubscribed_count").notNull().default(0),
  targetCount: integer("target_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
