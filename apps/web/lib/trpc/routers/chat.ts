import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../init"
import { chat, message, citation } from "@/lib/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"
import { generateId } from "@/lib/id"

export const chatRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: chat.id, title: chat.title })
      .from(chat)
      .where(
        and(
          eq(chat.userId, ctx.session.user.id),
          eq(chat.organizationId, ctx.organizationId),
        ),
      )
      .orderBy(desc(chat.updatedAt))
      .limit(50)
  }),

  create: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(chat).values({
        id: input.id,
        organizationId: ctx.organizationId,
        userId: ctx.session.user.id,
        title: input.title ?? null,
      })
      return { id: input.id }
    }),

  getMessages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chatRecord = await ctx.db.query.chat.findFirst({
        where: eq(chat.id, input.chatId),
      })

      if (!chatRecord || chatRecord.userId !== ctx.session.user.id) {
        return { messages: [], citations: [], organizationId: "" }
      }

      const messages = await ctx.db
        .select()
        .from(message)
        .where(eq(message.chatId, input.chatId))
        .orderBy(asc(message.createdAt))

      // Get citations for the last assistant message
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant")
      let citations: {
        number: number
        documentId: string
        documentName: string
        pageNumber: number
        chunkText: string
        relevanceScore: number
      }[] = []

      if (lastAssistant) {
        const rows = await ctx.db
          .select()
          .from(citation)
          .where(eq(citation.messageId, lastAssistant.id))

        citations = rows.map((c) => ({
          number: c.number,
          documentId: c.documentId ?? "",
          documentName: c.documentName,
          pageNumber: c.pageNumber ?? 0,
          chunkText: c.chunkText,
          relevanceScore: c.relevanceScore ?? 0,
        }))
      }

      return {
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        citations,
        organizationId: chatRecord.organizationId,
      }
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        citations: z
          .array(
            z.object({
              number: z.number(),
              documentId: z.string().optional(),
              documentName: z.string(),
              pageNumber: z.number().optional(),
              chunkText: z.string(),
              relevanceScore: z.number().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const messageId = generateId()
      await ctx.db.insert(message).values({
        id: messageId,
        chatId: input.chatId,
        role: input.role,
        content: input.content,
      })

      if (input.citations?.length) {
        await ctx.db.insert(citation).values(
          input.citations.map((c) => ({
            id: generateId(),
            messageId,
            number: c.number,
            documentId: c.documentId ?? null,
            documentName: c.documentName,
            pageNumber: c.pageNumber ?? null,
            chunkText: c.chunkText,
            relevanceScore: c.relevanceScore ?? null,
          })),
        )
      }

      return { id: messageId }
    }),
})
