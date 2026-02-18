"use client"

import { useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { useHeader } from "@/components/header-context"
import { ChatInterface } from "@/components/chat/chat-interface"
import { MessageInput } from "@/components/chat/message-input"
import { Skeleton } from "@/components/ui/skeleton"

export function ChatView({ chatId }: { chatId: string }) {
  const { data, isPending } = trpc.chat.getMessages.useQuery({ chatId })
  const { setTitle } = useHeader()

  useEffect(() => {
    if (isPending) {
      setTitle("Loading...")
    } else if (data?.title) {
      setTitle(data.title)
    }
    return () => setTitle("Azure RAG")
  }, [isPending, data?.title, setTitle])

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full min-h-full max-w-3xl flex-col justify-end px-4 pb-6">
            <div className="flex gap-3 py-4 justify-end">
              <div className="w-2/5 rounded-2xl bg-primary/10 px-4 py-3">
                <Skeleton className="h-4 w-full rounded-md bg-primary/10" />
              </div>
            </div>
            <div className="flex gap-3 py-4 justify-start">
              <div className="w-3/4 rounded-2xl bg-muted px-4 py-3 space-y-2">
                <Skeleton className="h-4 w-full rounded-md bg-muted-foreground/10" />
                <Skeleton className="h-4 w-5/6 rounded-md bg-muted-foreground/10" />
                <Skeleton className="h-4 w-2/3 rounded-md bg-muted-foreground/10" />
              </div>
            </div>
            <div className="flex gap-3 py-4 justify-end">
              <div className="w-1/3 rounded-2xl bg-primary/10 px-4 py-3">
                <Skeleton className="h-4 w-full rounded-md bg-primary/10" />
              </div>
            </div>
            <div className="flex gap-3 py-4 justify-start">
              <div className="w-2/3 rounded-2xl bg-muted px-4 py-3 space-y-2">
                <Skeleton className="h-4 w-full rounded-md bg-muted-foreground/10" />
                <Skeleton className="h-4 w-3/4 rounded-md bg-muted-foreground/10" />
              </div>
            </div>
          </div>
        </div>
        <MessageInput onSend={() => {}} disabled />
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
    />
  )
}
