import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const complianceProgressTable = pgTable("compliance_progress", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  notes: text("notes"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ComplianceProgress = typeof complianceProgressTable.$inferSelect;
