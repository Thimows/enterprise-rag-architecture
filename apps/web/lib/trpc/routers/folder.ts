import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../init"
import { folder } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { generateId } from "@/lib/id"

export const folderRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: folder.id,
        name: folder.name,
        description: folder.description,
      })
      .from(folder)
      .where(eq(folder.organizationId, ctx.organizationId))
      .orderBy(desc(folder.createdAt))
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const id = generateId()
      await ctx.db.insert(folder).values({
        id,
        organizationId: ctx.organizationId,
        name: input.name,
        description: input.description ?? null,
        createdBy: ctx.session.user.id,
      })
      return { id }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(folder)
        .where(
          and(
            eq(folder.id, input.id),
            eq(folder.organizationId, ctx.organizationId),
          ),
        )
      return { ok: true }
    }),
})
