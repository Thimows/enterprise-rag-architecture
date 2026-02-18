import { createTRPCRouter } from "../init"
import { chatRouter } from "./chat"
import { folderRouter } from "./folder"
import { documentRouter } from "./document"

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  folder: folderRouter,
  document: documentRouter,
})

export type AppRouter = typeof appRouter
