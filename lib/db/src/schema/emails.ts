import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { contactsTable } from "./contacts";
import { campaignsTable } from "./campaigns";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaignsTable.id, { onDelete: "set null" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  toEmail: text("to_email").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  status: text("status").notNull().default("pending"),
  resendId: text("resend_id"),
  opened: boolean("opened").notNull().default(false),
  clicked: boolean("clicked").notNull().default(false),
  replied: boolean("replied").notNull().default(false),
  bounced: boolean("bounced").notNull().default(false),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type EmailRecord = typeof emailsTable.$inferSelect;

export const emailEventsTable = pgTable("email_events", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull().references(() => emailsTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unsubscribeTokensTable = pgTable("unsubscribe_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  emailId: integer("email_id").references(() => emailsTable.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
