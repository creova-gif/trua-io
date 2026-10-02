import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("conversations_org_id_idx").on(table.orgId)],
);

// orgId is taken from the session, never from the client payload.
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
