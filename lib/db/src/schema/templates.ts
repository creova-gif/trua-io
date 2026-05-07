import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  industry: text("industry").notNull().default("general"),
  tone: text("tone").notNull().default("professional"),
  language: text("language").notNull().default("en"),
  subjectLine: text("subject_line").notNull(),
  bodyHtml: text("body_html").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
