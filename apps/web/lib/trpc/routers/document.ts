import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../init"
import { document } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export const documentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ folderId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(document.organizationId, ctx.organizationId)]

      if (input?.folderId) {
        conditions.push(eq(document.folderId, input.folderId))
      }

      return ctx.db
        .select({
          id: document.id,
          name: document.name,
          fileType: document.fileType,
          fileSize: document.fileSize,
          status: document.status,
          createdAt: document.createdAt,
        })
        .from(document)
        .where(and(...conditions))
        .orderBy(desc(document.createdAt))
    }),
})
