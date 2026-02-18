import type { CreateTRPCReact } from "@trpc/react-query"
import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "./routers"

export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>()
