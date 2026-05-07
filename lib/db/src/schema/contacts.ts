import { pgTable, text, serial, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  companySize: text("company_size"),
  industry: text("industry"),
  city: text("city"),
  country: text("country").notNull().default("Tanzania"),
  website: text("website"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  stage: text("stage").notNull().default("prospect"),
  leadScore: integer("lead_score").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  optedIn: boolean("opted_in").notNull().default(false),
  optedOut: boolean("opted_out").notNull().default(false),
  enriched: boolean("enriched").notNull().default(false),
  lastContacted: timestamp("last_contacted", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;

export const consentRecordsTable = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  legalBasis: text("legal_basis").notNull().default("legitimate_interest"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
