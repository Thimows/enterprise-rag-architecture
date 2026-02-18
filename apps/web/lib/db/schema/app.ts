import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  integer,
  bigint,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { organization, user } from "./auth"

export const folder = pgTable(
  "folder",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("folder_organizationId_idx").on(table.organizationId)],
)

export const document = pgTable(
  "document",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    blobUrl: text("blob_url").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    status: text("status").default("uploading").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("document_organizationId_idx").on(table.organizationId),
    index("document_folderId_idx").on(table.folderId),
  ],
)

export const chat = pgTable(
  "chat",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_organizationId_idx").on(table.organizationId),
    index("chat_userId_idx").on(table.userId),
  ],
)

export const message = pgTable(
  "message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("message_chatId_idx").on(table.chatId)],
)

export const citation = pgTable(
  "citation",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    documentId: text("document_id"),
    documentName: text("document_name").notNull(),
    pageNumber: integer("page_number"),
    chunkText: text("chunk_text").notNull(),
    relevanceScore: real("relevance_score"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("citation_messageId_idx").on(table.messageId)],
)

// Relations

export const folderRelations = relations(folder, ({ one, many }) => ({
  organization: one(organization, {
    fields: [folder.organizationId],
    references: [organization.id],
  }),
  createdByUser: one(user, {
    fields: [folder.createdBy],
    references: [user.id],
  }),
  documents: many(document),
}))

export const documentRelations = relations(document, ({ one }) => ({
  organization: one(organization, {
    fields: [document.organizationId],
    references: [organization.id],
  }),
  folder: one(folder, {
    fields: [document.folderId],
    references: [folder.id],
  }),
  uploadedByUser: one(user, {
    fields: [document.uploadedBy],
    references: [user.id],
  }),
}))

export const chatRelations = relations(chat, ({ one, many }) => ({
  organization: one(organization, {
    fields: [chat.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  messages: many(message),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
  citations: many(citation),
}))

export const citationRelations = relations(citation, ({ one }) => ({
  message: one(message, {
    fields: [citation.messageId],
    references: [message.id],
  }),
}))
