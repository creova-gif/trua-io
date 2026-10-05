import {
  db,
  conversations,
  messages,
  type Conversation,
  type Message,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type ConversationWithMessages = Conversation & { messages: Message[] };

export interface ConversationStore {
  list(orgId: number): Promise<Conversation[]>;
  create(orgId: number, title: string): Promise<Conversation>;
  get(orgId: number, id: number): Promise<ConversationWithMessages | undefined>;
  delete(orgId: number, id: number): Promise<Conversation | undefined>;
  /** Undefined when the conversation is not in the org. */
  listMessages(
    orgId: number,
    conversationId: number,
  ): Promise<Message[] | undefined>;
  /** Undefined when the conversation is not in the org. Does not call the model. */
  addUserMessage(
    orgId: number,
    conversationId: number,
    content: string,
  ): Promise<{ conversation: Conversation; history: Message[] } | undefined>;
  addAssistantMessage(
    orgId: number,
    conversationId: number,
    content: string,
  ): Promise<void>;
}

/**
 * Conversation queries used by the production store. Each one constrains
 * org_id. Message queries below are not exported: they are only called
 * after one of these checks has succeeded.
 */
export const conversationQueries = {
  list(orgId: number) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.orgId, orgId))
      .orderBy(conversations.createdAt);
  },
  find(id: number, orgId: number) {
    return db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.orgId, orgId)));
  },
  insertConversation(orgId: number, title: string) {
    return db.insert(conversations).values({ orgId, title }).returning();
  },
  remove(id: number, orgId: number) {
    return db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.orgId, orgId)))
      .returning();
  },
  ownedId(id: number, orgId: number) {
    return db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.orgId, orgId)));
  },
};

const messageQueries = {
  list(conversationId: number) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },
  insert(conversationId: number, role: string, content: string) {
    return db
      .insert(messages)
      .values({ conversationId, role, content })
      .returning();
  },
};

export const drizzleConversationStore: ConversationStore = {
  list(orgId) {
    return conversationQueries.list(orgId);
  },

  async create(orgId, title) {
    const [conv] = await conversationQueries.insertConversation(orgId, title);
    if (!conv) {
      throw new Error("Failed to create conversation");
    }
    return conv;
  },

  async get(orgId, id) {
    const [conv] = await conversationQueries.find(id, orgId);
    if (!conv) return undefined;
    const msgs = await messageQueries.list(id);
    return { ...conv, messages: msgs };
  },

  async delete(orgId, id) {
    const [conv] = await conversationQueries.remove(id, orgId);
    return conv;
  },

  async listMessages(orgId, conversationId) {
    const [owned] = await conversationQueries.ownedId(conversationId, orgId);
    if (!owned) return undefined;
    return messageQueries.list(conversationId);
  },

  async addUserMessage(orgId, conversationId, content) {
    const [conv] = await conversationQueries.find(conversationId, orgId);
    if (!conv) return undefined;
    await messageQueries.insert(conversationId, "user", content);
    const history = await messageQueries.list(conversationId);
    return { conversation: conv, history };
  },

  async addAssistantMessage(orgId, conversationId, content) {
    const [owned] = await conversationQueries.ownedId(conversationId, orgId);
    if (!owned) return;
    await messageQueries.insert(conversationId, "assistant", content);
  },
};
