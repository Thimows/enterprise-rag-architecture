"use client"

import { trpc } from "@/lib/trpc/client"
import { ChatInterface } from "@/components/chat/chat-interface"
import { Skeleton } from "@/components/ui/skeleton"

export function ChatView({ chatId }: { chatId: string }) {
  const { data, isPending } = trpc.chat.getMessages.useQuery({ chatId })

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-1/2 self-end" />
        <Skeleton className="h-16 w-3/4" />
      </div>
    )
  }

  if (!data || !data.organizationId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    )
  }

  return (
    <ChatInterface
      organizationId={data.organizationId}
      chatId={chatId}
      initialMessages={data.messages}
      initialCitations={data.citations.map((c) => ({
        ...c,
        documentUrl: "",
      }))}
    />
  )
}
