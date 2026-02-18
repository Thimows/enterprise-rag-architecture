import { initTRPC, TRPCError } from "@trpc/server"
import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return { session, db }
})

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create()

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  const activeOrgId = ctx.session.session.activeOrganizationId
  if (!activeOrgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      organizationId: activeOrgId,
    },
  })
})
