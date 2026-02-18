"use client"

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { ChatInterface } from "@/components/chat/chat-interface"
import { generateId } from "@/lib/id"

export function NewChatPage() {
  const router = useRouter()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const createChat = trpc.chat.create.useMutation()
  const utils = trpc.useUtils()

  if (!activeOrg) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-lg font-medium">No workspace selected</p>
          <p className="text-sm text-muted-foreground">
            Select or create a workspace from the sidebar.
          </p>
        </div>
      </div>
    )
  }

  async function handleFirstMessage(message: string) {
    const chatId = generateId()
    const title = message.slice(0, 80)

    await createChat.mutateAsync({ id: chatId, title })
    utils.chat.list.invalidate()

    router.replace(`/chat/${chatId}`)
  }

  return (
    <ChatInterface
      organizationId={activeOrg.id}
      onFirstMessage={handleFirstMessage}
    />
  )
}
